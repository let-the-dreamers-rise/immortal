"""RevenueCat subscriptions: the Inner Chamber (内室) membership.

The app talks to RevenueCat directly to buy; the server never trusts the
client's claim that a purchase happened. It learns about entitlements two ways:

1. ``POST /api/billing/sync`` asks RevenueCat's REST API for the subscriber
   (needs ``REVENUECAT_SECRET_KEY``). The app calls this right after a purchase
   or restore so the unlock is immediate.
2. ``POST /api/billing/webhook`` receives RevenueCat's server-to-server events
   (renewals, expirations, refunds). Guarded by ``REVENUECAT_WEBHOOK_AUTH``,
   which must match the Authorization header configured in the RevenueCat
   dashboard.

When no secret key is configured the server cannot verify anything, so premium
gates are not enforced server-side (``enforcing()`` is False). That keeps a
fresh deployment usable before RevenueCat is wired up; the app still shows the
paywall.
"""

from __future__ import annotations

import hmac
import logging
import os
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request

logger = logging.getLogger("immortality.billing")

RC_API = "https://api.revenuecat.com/v1"
ENTITLEMENT_ID = os.environ.get("REVENUECAT_ENTITLEMENT_ID", "pro")

# Events after which the subscriber state must be re-read. Anything else
# (e.g. TEST, SUBSCRIBER_ALIAS) is acknowledged and ignored.
REFRESH_EVENTS = {
    "INITIAL_PURCHASE",
    "RENEWAL",
    "PRODUCT_CHANGE",
    "CANCELLATION",
    "UNCANCELLATION",
    "NON_RENEWING_PURCHASE",
    "EXPIRATION",
    "BILLING_ISSUE",
    "SUBSCRIPTION_PAUSED",
    "SUBSCRIPTION_EXTENDED",
    "TEMPORARY_ENTITLEMENT_GRANT",
    "REFUND_REVERSED",
    "TRANSFER",
}


def secret_key() -> str:
    return (os.environ.get("REVENUECAT_SECRET_KEY") or "").strip()


def enforcing() -> bool:
    return bool(secret_key())


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def entitlement_state(subscriber: dict, now: datetime) -> dict:
    """Reduce a RevenueCat subscriber payload to what the app stores.

    A missing ``expires_date`` on an existing entitlement means lifetime.
    """
    ent = (subscriber.get("entitlements") or {}).get(ENTITLEMENT_ID)
    if not ent:
        return {"is_premium": False, "premium_expires_at": None, "premium_product": None}
    expires = _parse_iso(ent.get("expires_date"))
    active = expires is None or expires > now
    return {
        "is_premium": active,
        "premium_expires_at": expires,
        "premium_product": ent.get("product_identifier"),
    }


def user_is_premium(user: dict, now: Optional[datetime] = None) -> bool:
    if not user.get("is_premium"):
        return False
    exp = user.get("premium_expires_at")
    if exp is None:
        return True
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return exp > (now or datetime.now(timezone.utc))


async def fetch_subscriber(app_user_id: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as hc:
        resp = await hc.get(
            f"{RC_API}/subscribers/{app_user_id}",
            headers={"Authorization": f"Bearer {secret_key()}"},
        )
    if resp.status_code != 200:
        logger.warning("RevenueCat subscriber lookup failed: %s", resp.status_code)
        raise HTTPException(status_code=502, detail="Could not reach the subscription service. Try again shortly.")
    return resp.json().get("subscriber") or {}


def build_router(db, get_current_user: Callable[..., Awaitable[dict]], public_user: Callable[[dict], dict]) -> APIRouter:
    router = APIRouter()

    async def refresh_user(user_id: str) -> Optional[dict]:
        subscriber = await fetch_subscriber(user_id)
        state = entitlement_state(subscriber, datetime.now(timezone.utc))
        await db.users.update_one({"user_id": user_id}, {"$set": state})
        return await db.users.find_one({"user_id": user_id}, {"_id": 0})

    @router.get("/billing/status")
    async def status(user: dict = Depends(get_current_user)):
        return {
            "is_premium": user_is_premium(user),
            "premium_expires_at": user.get("premium_expires_at"),
            "entitlement_id": ENTITLEMENT_ID,
            "server_verified": enforcing(),
        }

    @router.post("/billing/sync")
    async def sync(user: dict = Depends(get_current_user)):
        if not enforcing():
            return {"user": public_user(user), "server_verified": False}
        fresh = await refresh_user(user["user_id"])
        return {"user": public_user(fresh or user), "server_verified": True}

    @router.post("/billing/webhook")
    async def webhook(request: Request, authorization: Optional[str] = Header(default=None)):
        expected = (os.environ.get("REVENUECAT_WEBHOOK_AUTH") or "").strip()
        if not expected or not hmac.compare_digest((authorization or "").strip(), expected):
            raise HTTPException(status_code=401, detail="Unauthorized")
        payload = await request.json()
        event = payload.get("event") or {}
        etype = event.get("type")
        if etype not in REFRESH_EVENTS or not enforcing():
            return {"ok": True, "ignored": etype}
        ids = {event.get("app_user_id"), *(event.get("aliases") or []), *(event.get("transferred_to") or [])}
        for uid in ids:
            if uid and uid.startswith("user_") and await db.users.find_one({"user_id": uid}, {"_id": 1}):
                await refresh_user(uid)
        return {"ok": True}

    return router


def premium_guard(user: dict) -> None:
    """Raise 402 when the server can verify entitlements and the user lacks one."""
    if enforcing() and not user_is_premium(user):
        raise HTTPException(
            status_code=402,
            detail="This is part of the Inner Chamber membership.",
        )
