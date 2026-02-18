import type { Role } from "@/types/portal";
import type { Route } from "next";

export type MotionPreset = "none" | "subtle" | "rich";

export interface NavItem {
  label: string;
  href: Route;
  keywords?: string[];
}

export interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

export interface RoleNavConfig {
  STUDENT: NavSection[];
  ADMIN: NavSection[];
}

export interface PageMeta {
  title: string;
  subtitle?: string;
  roleScope?: Role | "PUBLIC";
  breadcrumb?: string[];
}

export interface AsyncViewState<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
}

export interface UiThemeTokens {
  color: Record<string, string>;
  space: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  motion: Record<string, string>;
  z: Record<string, string>;
}
