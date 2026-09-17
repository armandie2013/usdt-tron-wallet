import type {
  Metadata,
} from "next";

import "./globals.css";
import "./theme.css";

import ThemeProvider from "@/components/theme/ThemeProvider";

import WalletHeaderThemeToggle from "@/components/theme/WalletHeaderThemeToggle";

import WalletNavigationEnhancer from "@/components/wallet/WalletNavigationEnhancer";

export const metadata:
  Metadata = {
  title: {
    default:
      "Mi Wallet",

    template:
      "%s | Mi Wallet",
  },

  description:
    "Wallet USDT sobre la red TRON.",
};

const themeScript = `
(function () {
  try {
    var storageKey = "wallet-theme";

    var stored =
      localStorage.getItem(
        storageKey
      );

    var theme =
      stored === "dark" ||
      stored === "light"
        ? stored
        : "light";

    var root =
      document.documentElement;

    root.setAttribute(
      "data-theme",
      theme
    );

    if (
      theme === "dark"
    ) {
      root.classList.add(
        "dark"
      );
    } else {
      root.classList.remove(
        "dark"
      );
    }

    root.style.colorScheme =
      theme;
  } catch (error) {
    var root =
      document.documentElement;

    root.setAttribute(
      "data-theme",
      "light"
    );

    root.classList.remove(
      "dark"
    );

    root.style.colorScheme =
      "light";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              themeScript,
          }}
        />
      </head>

      <body>
        <ThemeProvider>
          {children}

          <WalletHeaderThemeToggle />

          <WalletNavigationEnhancer />
        </ThemeProvider>
      </body>
    </html>
  );
}