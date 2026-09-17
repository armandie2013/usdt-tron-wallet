"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import ThemeToggle from "@/components/theme/ThemeToggle";

function findLogoutButton():
  HTMLButtonElement |
  null {
  const header =
    document.querySelector(
      "header",
    );

  if (
    !header
  ) {
    return null;
  }

  const buttons =
    Array.from(
      header.querySelectorAll(
        "button",
      ),
    );

  for (
    const button
    of buttons
  ) {
    if (
      !(
        button instanceof
        HTMLButtonElement
      )
    ) {
      continue;
    }

    const title =
      (
        button.getAttribute(
          "title",
        ) ??
        ""
      ).toLowerCase();

    const ariaLabel =
      (
        button.getAttribute(
          "aria-label",
        ) ??
        ""
      ).toLowerCase();

    if (
      title.includes(
        "cerrar sesión",
      ) ||
      title.includes(
        "cerrar sesion",
      ) ||
      ariaLabel.includes(
        "cerrar sesión",
      ) ||
      ariaLabel.includes(
        "cerrar sesion",
      )
    ) {
      return button;
    }
  }

  return null;
}

export default function WalletHeaderThemeToggle() {
  const [
    portalTarget,
    setPortalTarget,
  ] =
    useState<HTMLElement | null>(
      null,
    );

  useEffect(
    () => {
      let resizeObserver:
        ResizeObserver |
        null =
        null;

      let mutationObserver:
        MutationObserver |
        null =
        null;

      let currentLogout:
        HTMLButtonElement |
        null =
        null;

      let currentSlot:
        HTMLSpanElement |
        null =
        null;

      /*
       * ========================================================
       * POSICIONAR
       * ========================================================
       */

      function updatePosition() {
        if (
          !currentLogout ||
          !currentSlot
        ) {
          return;
        }

        const parent =
          currentLogout
            .parentElement;

        if (
          !parent
        ) {
          return;
        }

        const parentRect =
          parent
            .getBoundingClientRect();

        const logoutRect =
          currentLogout
            .getBoundingClientRect();

        const gap =
          8;

        const buttonWidth =
          logoutRect.width;

        const left =
          logoutRect.left -
          parentRect.left -
          gap -
          buttonWidth;

        const top =
          logoutRect.top -
          parentRect.top;

        currentSlot.style.left =
          `${left}px`;

        currentSlot.style.top =
          `${top}px`;

        currentSlot.style.width =
          `${buttonWidth}px`;

        currentSlot.style.height =
          `${logoutRect.height}px`;
      }

      /*
       * ========================================================
       * CONFIGURAR
       * ========================================================
       */

      function configure() {
        const logout =
          findLogoutButton();

        if (
          !logout
        ) {
          return false;
        }

        const parent =
          logout.parentElement;

        if (
          !parent
        ) {
          return false;
        }

        /*
         * El contenedor del header pasa a ser
         * referencia para el posicionamiento absoluto.
         */

        if (
          window
            .getComputedStyle(
              parent,
            )
            .position ===
          "static"
        ) {
          parent.style.position =
            "relative";
        }

        let slot =
          parent.querySelector<HTMLSpanElement>(
            '[data-wallet-theme-slot="true"]',
          );

        if (
          !slot
        ) {
          slot =
            document.createElement(
              "span",
            );

          slot.dataset
            .walletThemeSlot =
            "true";

          slot.style.position =
            "absolute";

          slot.style.display =
            "inline-flex";

          slot.style.alignItems =
            "center";

          slot.style.justifyContent =
            "center";

          slot.style.zIndex =
            "5";

          parent.appendChild(
            slot,
          );
        }

        currentLogout =
          logout;

        currentSlot =
          slot;

        setPortalTarget(
          slot,
        );

        updatePosition();

        return true;
      }

      /*
       * ========================================================
       * INITIAL
       * ========================================================
       */

      configure();

      /*
       * ========================================================
       * RESIZE
       * ========================================================
       */

      window.addEventListener(
        "resize",
        updatePosition,
      );

      if (
        typeof ResizeObserver !==
        "undefined"
      ) {
        resizeObserver =
          new ResizeObserver(
            () => {
              updatePosition();
            },
          );

        const header =
          document.querySelector(
            "header",
          );

        if (
          header
        ) {
          resizeObserver.observe(
            header,
          );
        }
      }

      /*
       * ========================================================
       * ESPERAR HEADER SI TODAVÍA NO EXISTE
       * ========================================================
       */

      mutationObserver =
        new MutationObserver(
          () => {
            if (
              !currentLogout ||
              !document.contains(
                currentLogout,
              )
            ) {
              configure();
            }
          },
        );

      mutationObserver.observe(
        document.body,
        {
          childList:
            true,

          subtree:
            true,
        },
      );

      return () => {
        window.removeEventListener(
          "resize",
          updatePosition,
        );

        resizeObserver
          ?.disconnect();

        mutationObserver
          ?.disconnect();

        if (
          currentSlot &&
          currentSlot.parentElement
        ) {
          currentSlot.remove();
        }
      };
    },
    [],
  );

  if (
    !portalTarget
  ) {
    return null;
  }

  return createPortal(
    <ThemeToggle
      compact
    />,
    portalTarget,
  );
}