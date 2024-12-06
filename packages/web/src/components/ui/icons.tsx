import {
  Apple,
  Loader2,
  LightbulbIcon as LucideProps,
  ChromeIcon as Google,
  DiscIcon as Discord,
  LoaderCircle as Loader,
} from "lucide-react";

export const Icons = {
  spinner: Loader,
  google: Google,
  apple: Apple,
  discord: Discord,
};

export type Icon = keyof typeof Icons;
