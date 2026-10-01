// Icons loaded one file each. Importing from the package root pulled all
// ~1,500 Phosphor icons (5.7 MB of source) into the app and the web build,
// which a first visit on a slow mobile connection had to download.
// require() keeps TypeScript out of the package's own .tsx sources.
/* eslint-disable @typescript-eslint/no-require-imports */
import type { Icon } from "phosphor-react-native";

export const Barbell: Icon = require("phosphor-react-native/src/icons/Barbell").Barbell;
export const Bell: Icon = require("phosphor-react-native/src/icons/Bell").Bell;
export const BookOpen: Icon = require("phosphor-react-native/src/icons/BookOpen").BookOpen;
export const CalendarBlank: Icon = require("phosphor-react-native/src/icons/CalendarBlank").CalendarBlank;
export const CaretLeft: Icon = require("phosphor-react-native/src/icons/CaretLeft").CaretLeft;
export const CaretRight: Icon = require("phosphor-react-native/src/icons/CaretRight").CaretRight;
export const ChatCircle: Icon = require("phosphor-react-native/src/icons/ChatCircle").ChatCircle;
export const Check: Icon = require("phosphor-react-native/src/icons/Check").Check;
export const CircleIcon: Icon = require("phosphor-react-native/src/icons/Circle").CircleIcon;
export const Clock: Icon = require("phosphor-react-native/src/icons/Clock").Clock;
export const Crown: Icon = require("phosphor-react-native/src/icons/Crown").Crown;
export const DotsThree: Icon = require("phosphor-react-native/src/icons/DotsThree").DotsThree;
export const Eye: Icon = require("phosphor-react-native/src/icons/Eye").Eye;
export const EyeSlash: Icon = require("phosphor-react-native/src/icons/EyeSlash").EyeSlash;
export const GearSix: Icon = require("phosphor-react-native/src/icons/GearSix").GearSix;
export const GitBranch: Icon = require("phosphor-react-native/src/icons/GitBranch").GitBranch;
export const Globe: Icon = require("phosphor-react-native/src/icons/Globe").Globe;
export const House: Icon = require("phosphor-react-native/src/icons/House").House;
export const Info: Icon = require("phosphor-react-native/src/icons/Info").Info;
export const Key: Icon = require("phosphor-react-native/src/icons/Key").Key;
export const Lock: Icon = require("phosphor-react-native/src/icons/Lock").Lock;
export const MapPin: Icon = require("phosphor-react-native/src/icons/MapPin").MapPin;
export const NotePencil: Icon = require("phosphor-react-native/src/icons/NotePencil").NotePencil;
export const PaperPlaneRight: Icon = require("phosphor-react-native/src/icons/PaperPlaneRight").PaperPlaneRight;
export const Pause: Icon = require("phosphor-react-native/src/icons/Pause").Pause;
export const Play: Icon = require("phosphor-react-native/src/icons/Play").Play;
export const SignOut: Icon = require("phosphor-react-native/src/icons/SignOut").SignOut;
export const SkipForward: Icon = require("phosphor-react-native/src/icons/SkipForward").SkipForward;
export const Sparkle: Icon = require("phosphor-react-native/src/icons/Sparkle").Sparkle;
export const Sun: Icon = require("phosphor-react-native/src/icons/Sun").Sun;
export const Trash: Icon = require("phosphor-react-native/src/icons/Trash").Trash;
export const Users: Icon = require("phosphor-react-native/src/icons/Users").Users;
export const UsersThree: Icon = require("phosphor-react-native/src/icons/UsersThree").UsersThree;
export const Warning: Icon = require("phosphor-react-native/src/icons/Warning").Warning;
export const X: Icon = require("phosphor-react-native/src/icons/X").X;
export const YinYang: Icon = require("phosphor-react-native/src/icons/YinYang").YinYang;
