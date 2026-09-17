"use client";

import {
  useEffect,
} from "react";

type WalletNavSection =
  | "home"
  | "send"
  | "receive"
  | "security";

interface WalletNavDefinition {
  section:
    WalletNavSection;

  label:
    string;

  targetId?:
    string;
}

const NAV_ITEMS:
  WalletNavDefinition[] = [
    {
      section:
        "home",

      label:
        "Inicio",

      targetId:
        "wallet-home",
    },

    {
      section:
        "send",

      label:
        "Enviar",

      targetId:
        "wallet-send",
    },

    {
      section:
        "receive",

      label:
        "Recibir",
    },

    {
      section:
        "security",

      label:
        "Seguridad",

      targetId:
        "wallet-security",
    },
  ];

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function normalizeText(
  value:
    string | null,
): string {
  return (
    value ??
    ""
  )
    .replace(
      /\s+/g,
      " ",
    )
    .trim()
    .toLowerCase();
}

function findWalletNav():
  HTMLElement |
  null {
  const navs =
    Array.from(
      document.querySelectorAll(
        "nav",
      ),
    );

  for (
    const nav
    of navs
  ) {
    if (
      !(
        nav instanceof
        HTMLElement
      )
    ) {
      continue;
    }

    const text =
      normalizeText(
        nav.textContent,
      );

    const containsAll =
      NAV_ITEMS.every(
        (
          item,
        ) =>
          text.includes(
            item.label
              .toLowerCase(),
          ),
      );

    if (
      containsAll
    ) {
      return nav;
    }
  }

  return null;
}

function findNavButton(
  nav:
    HTMLElement,

  label:
    string,
):
  HTMLButtonElement |
  null {
  const buttons =
    Array.from(
      nav.querySelectorAll(
        "button",
      ),
    );

  const expected =
    label
      .trim()
      .toLowerCase();

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

    const text =
      normalizeText(
        button.textContent,
      );

    if (
      text ===
        expected ||
      text.includes(
        expected,
      )
    ) {
      return button;
    }
  }

  return null;
}

function setActiveSection(
  nav:
    HTMLElement,

  section:
    WalletNavSection,
) {
  const buttons =
    nav.querySelectorAll<HTMLButtonElement>(
      "button[data-wallet-nav]",
    );

  buttons.forEach(
    (
      button,
    ) => {
      const active =
        button.dataset
          .walletNav ===
        section;

      button.dataset.active =
        active
          ? "true"
          : "false";

      if (
        active
      ) {
        button.setAttribute(
          "aria-current",
          "page",
        );
      } else {
        button.removeAttribute(
          "aria-current",
        );
      }
    },
  );
}

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function WalletNavigationEnhancer() {
  useEffect(
    () => {
      let currentNav:
        HTMLElement |
        null =
        null;

      let cleanupCurrent:
        (() => void) |
        null =
        null;

      let scrollFrame:
        number |
        null =
        null;

      /*
       * ========================================================
       * CONFIGURAR NAV
       * ========================================================
       */

      function configureNavigation(
        nav:
          HTMLElement,
      ) {
        if (
          currentNav ===
          nav
        ) {
          return;
        }

        cleanupCurrent
          ?.();

        currentNav =
          nav;

        nav.classList.add(
          "wallet-nav-enhanced",
        );

        const buttons:
          Array<{
            section:
              WalletNavSection;

            button:
              HTMLButtonElement;
          }> =
          [];

        /*
         * ======================================================
         * IDENTIFICAR BOTONES
         * ======================================================
         */

        for (
          const definition
          of NAV_ITEMS
        ) {
          const button =
            findNavButton(
              nav,
              definition.label,
            );

          if (
            !button
          ) {
            continue;
          }

          button.dataset
            .walletNav =
            definition.section;

          button.dataset.active =
            "false";

          button.removeAttribute(
            "aria-current",
          );

          /*
           * ====================================================
           * IMPORTANTE
           * ====================================================
           *
           * Inicio tenía estas clases originales
           * permanentemente aplicadas desde dashboard.
           *
           * Las quitamos para que solamente data-active
           * determine qué botón está seleccionado.
           */

          button.classList.remove(
            "bg-cyan-400/10",
          );

          button.classList.remove(
            "text-cyan-300",
          );

          buttons.push({
            section:
              definition.section,

            button,
          });
        }

        /*
         * ======================================================
         * CLICK HANDLERS
         * ======================================================
         */

        const clickCleanups:
          Array<
            () => void
          > =
          [];

        for (
          const {
            section,
            button,
          }
          of buttons
        ) {
          const handler =
            () => {
              setActiveSection(
                nav,
                section,
              );

              /*
               * Evitamos que :focus quede visualmente
               * como un segundo estado seleccionado.
               */

              window.setTimeout(
                () => {
                  button.blur();
                },
                0,
              );
            };

          button.addEventListener(
            "click",
            handler,
          );

          clickCleanups.push(
            () => {
              button.removeEventListener(
                "click",
                handler,
              );
            },
          );
        }

        /*
         * ======================================================
         * DETECTAR SECCIÓN ACTUAL
         * ======================================================
         */

        function updateFromScroll() {
          const header =
            document.querySelector(
              "header",
            );

          const headerHeight =
            header instanceof
              HTMLElement
              ? header
                  .getBoundingClientRect()
                  .height
              : 70;

          const referenceY =
            headerHeight +
            34;

          const home =
            document.getElementById(
              "wallet-home",
            );

          const send =
            document.getElementById(
              "wallet-send",
            );

          const security =
            document.getElementById(
              "wallet-security",
            );

          const sections:
            Array<{
              section:
                WalletNavSection;

              element:
                HTMLElement;
            }> =
            [];

          if (
            home instanceof
            HTMLElement
          ) {
            sections.push({
              section:
                "home",

              element:
                home,
            });
          }

          if (
            send instanceof
            HTMLElement
          ) {
            sections.push({
              section:
                "send",

              element:
                send,
            });
          }

          if (
            security instanceof
            HTMLElement
          ) {
            sections.push({
              section:
                "security",

              element:
                security,
            });
          }

          if (
            sections.length ===
            0
          ) {
            return;
          }

          let selected:
            WalletNavSection =
            "home";

          /*
           * Se selecciona la última sección cuyo
           * inicio ya pasó por debajo del header.
           */

          for (
            const item
            of sections
          ) {
            const rect =
              item.element
                .getBoundingClientRect();

            if (
              rect.top <=
              referenceY
            ) {
              selected =
                item.section;
            }
          }

          /*
           * ====================================================
           * FINAL DE PÁGINA
           * ====================================================
           *
           * Seguridad está muy cerca del final y muchas veces
           * no puede llegar exactamente al header porque ya no
           * existe más contenido para seguir desplazando.
           */

          const distanceToBottom =
            document
              .documentElement
              .scrollHeight -
            (
              window.scrollY +
              window.innerHeight
            );

          if (
            distanceToBottom <=
              32 &&
            security instanceof
              HTMLElement
          ) {
            selected =
              "security";
          }

          setActiveSection(
            nav,
            selected,
          );
        }

        /*
         * ======================================================
         * SCROLL THROTTLE
         * ======================================================
         */

        function scheduleUpdate() {
          if (
            scrollFrame !==
            null
          ) {
            return;
          }

          scrollFrame =
            window
              .requestAnimationFrame(
                () => {
                  scrollFrame =
                    null;

                  updateFromScroll();
                },
              );
        }

        window.addEventListener(
          "scroll",
          scheduleUpdate,
          {
            passive:
              true,
          },
        );

        window.addEventListener(
          "resize",
          scheduleUpdate,
        );

        /*
         * Estado inicial.
         */

        updateFromScroll();

        /*
         * ======================================================
         * CLEANUP
         * ======================================================
         */

        cleanupCurrent =
          () => {
            window.removeEventListener(
              "scroll",
              scheduleUpdate,
            );

            window.removeEventListener(
              "resize",
              scheduleUpdate,
            );

            for (
              const cleanup
              of clickCleanups
            ) {
              cleanup();
            }

            if (
              scrollFrame !==
              null
            ) {
              window
                .cancelAnimationFrame(
                  scrollFrame,
                );

              scrollFrame =
                null;
            }

            nav.classList.remove(
              "wallet-nav-enhanced",
            );
          };
      }

      /*
       * ========================================================
       * LOCALIZAR NAV
       * ========================================================
       */

      function locateNavigation() {
        const foundNav =
          findWalletNav();

        if (
          !foundNav
        ) {
          return;
        }

        configureNavigation(
          foundNav,
        );
      }

      locateNavigation();

      /*
       * ========================================================
       * NAV PUEDE APARECER DESPUÉS DEL LOAD
       * ========================================================
       */

      const observer =
        new MutationObserver(
          () => {
            if (
              !currentNav ||
              !document.contains(
                currentNav,
              )
            ) {
              currentNav =
                null;

              locateNavigation();
            }
          },
        );

      observer.observe(
        document.body,
        {
          childList:
            true,

          subtree:
            true,
        },
      );

      return () => {
        observer.disconnect();

        cleanupCurrent
          ?.();

        if (
          scrollFrame !==
          null
        ) {
          window
            .cancelAnimationFrame(
              scrollFrame,
            );
        }
      };
    },
    [],
  );

  return null;
}