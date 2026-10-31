import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "@neondatabase/auth-ui/css";
import "./globals.css";

const themeBootstrap = `(() => {
  const key = "habit-journal-theme";
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  try {
    const savedTheme = window.localStorage.getItem(key);
    const theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : systemPrefersDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  } catch (error) {
    console.error("Unable to read the saved theme preference.", error);
    const theme = systemPrefersDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  }
})();`;

export const metadata: Metadata = {
  title: "Next Habit — My Discipline Journal",
  description: "A calm, thoughtful space to build habits, nourish yourself, and reflect.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
