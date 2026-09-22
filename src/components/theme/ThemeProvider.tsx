// "use client";

// import {
//   createContext,
//   useCallback,
//   useContext,
//   useEffect,
//   useMemo,
//   useState,
// } from "react";

// export type AppTheme =
//   | "light"
//   | "dark";

// interface ThemeContextValue {
//   theme: AppTheme;

//   mounted: boolean;

//   setTheme:
//     (
//       theme:
//         AppTheme,
//     ) => void;

//   toggleTheme:
//     () => void;
// }

// interface ThemeProviderProps {
//   children:
//     React.ReactNode;
// }

// /*
//  * ============================================================
//  * CONFIGURACIÓN
//  * ============================================================
//  */

// export const THEME_STORAGE_KEY =
//   "wallet-theme";

// export const DEFAULT_THEME:
//   AppTheme =
//   "light";

// /*
//  * ============================================================
//  * CONTEXT
//  * ============================================================
//  */

// const ThemeContext =
//   createContext<ThemeContextValue | null>(
//     null,
//   );

// /*
//  * ============================================================
//  * HELPERS
//  * ============================================================
//  */

// function isValidTheme(
//   value:
//     unknown,
// ): value is AppTheme {
//   return (
//     value ===
//       "light" ||
//     value ===
//       "dark"
//   );
// }

// function applyThemeToDocument(
//   theme:
//     AppTheme,
// ) {
//   if (
//     typeof document ===
//     "undefined"
//   ) {
//     return;
//   }

//   const root =
//     document.documentElement;

//   root.setAttribute(
//     "data-theme",
//     theme,
//   );

//   /*
//    * Conservamos también la clase dark para que
//    * Tailwind dark:* pueda seguir utilizándose.
//    */

//   root.classList.toggle(
//     "dark",
//     theme ===
//       "dark",
//   );

//   root.style.colorScheme =
//     theme;
// }

// /*
//  * ============================================================
//  * PROVIDER
//  * ============================================================
//  */

// export default function ThemeProvider({
//   children,
// }: ThemeProviderProps) {
//   const [
//     theme,
//     setThemeState,
//   ] =
//     useState<AppTheme>(
//       DEFAULT_THEME,
//     );

//   const [
//     mounted,
//     setMounted,
//   ] =
//     useState(
//       false,
//     );

//   /*
//    * ==========================================================
//    * INITIALIZE
//    * ==========================================================
//    *
//    * El script de layout.tsx aplica el tema antes de
//    * que React se hidrate para evitar flashes.
//    *
//    * Acá sincronizamos el estado React con ese valor.
//    */

//   useEffect(
//     () => {
//       const rootTheme =
//         document
//           .documentElement
//           .getAttribute(
//             "data-theme",
//           );

//       let resolvedTheme:
//         AppTheme =
//         DEFAULT_THEME;

//       if (
//         isValidTheme(
//           rootTheme,
//         )
//       ) {
//         resolvedTheme =
//           rootTheme;
//       } else {
//         try {
//           const stored =
//             window.localStorage
//               .getItem(
//                 THEME_STORAGE_KEY,
//               );

//           if (
//             isValidTheme(
//               stored,
//             )
//           ) {
//             resolvedTheme =
//               stored;
//           }
//         } catch (
//           storageError
//         ) {
//           console.warn(
//             "[THEME] No se pudo leer localStorage.",
//             storageError,
//           );
//         }
//       }

//       applyThemeToDocument(
//         resolvedTheme,
//       );

//       setThemeState(
//         resolvedTheme,
//       );

//       setMounted(
//         true,
//       );
//     },
//     [],
//   );

//   /*
//    * ==========================================================
//    * SET THEME
//    * ==========================================================
//    */

//   const setTheme =
//     useCallback(
//       (
//         nextTheme:
//           AppTheme,
//       ) => {
//         applyThemeToDocument(
//           nextTheme,
//         );

//         setThemeState(
//           nextTheme,
//         );

//         try {
//           window.localStorage
//             .setItem(
//               THEME_STORAGE_KEY,
//               nextTheme,
//             );
//         } catch (
//           storageError
//         ) {
//           console.warn(
//             "[THEME] No se pudo guardar el tema.",
//             storageError,
//           );
//         }
//       },
//       [],
//     );

//   /*
//    * ==========================================================
//    * TOGGLE
//    * ==========================================================
//    */

//   const toggleTheme =
//     useCallback(
//       () => {
//         setTheme(
//           theme ===
//             "light"
//             ? "dark"
//             : "light",
//         );
//       },
//       [
//         theme,
//         setTheme,
//       ],
//     );

//   /*
//    * ==========================================================
//    * CONTEXT VALUE
//    * ==========================================================
//    */

//   const value =
//     useMemo<ThemeContextValue>(
//       () => ({
//         theme,

//         mounted,

//         setTheme,

//         toggleTheme,
//       }),
//       [
//         theme,
//         mounted,
//         setTheme,
//         toggleTheme,
//       ],
//     );

//   return (
//     <ThemeContext.Provider
//       value={
//         value
//       }
//     >
//       {children}
//     </ThemeContext.Provider>
//   );
// }

// /*
//  * ============================================================
//  * HOOK
//  * ============================================================
//  */

// export function useTheme() {
//   const context =
//     useContext(
//       ThemeContext,
//     );

//   if (
//     !context
//   ) {
//     throw new Error(
//       "useTheme debe utilizarse dentro de ThemeProvider.",
//     );
//   }

//   return context;
// }

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppTheme =
  | "light"
  | "dark";

interface ThemeContextValue {
  theme: AppTheme;

  mounted: boolean;

  setTheme:
    (
      theme:
        AppTheme,
    ) => void;

  toggleTheme:
    () => void;
}

interface ThemeProviderProps {
  children:
    React.ReactNode;
}

export const THEME_STORAGE_KEY =
  "wallet-theme";

export const DEFAULT_THEME:
  AppTheme =
  "light";

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null,
  );

function isValidTheme(
  value:
    unknown,
): value is AppTheme {
  return (
    value ===
      "light" ||
    value ===
      "dark"
  );
}

function applyThemeToDocument(
  theme:
    AppTheme,
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  const root =
    document.documentElement;

  root.setAttribute(
    "data-theme",
    theme,
  );

  root.classList.toggle(
    "dark",
    theme ===
      "dark",
  );

  root.style.colorScheme =
    theme;
}

export default function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [
    theme,
    setThemeState,
  ] =
    useState<AppTheme>(
      DEFAULT_THEME,
    );

  const [
    mounted,
    setMounted,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      const rootTheme =
        document
          .documentElement
          .getAttribute(
            "data-theme",
          );

      let resolvedTheme:
        AppTheme =
        DEFAULT_THEME;

      if (
        isValidTheme(
          rootTheme,
        )
      ) {
        resolvedTheme =
          rootTheme;
      } else {
        try {
          const stored =
            window.localStorage
              .getItem(
                THEME_STORAGE_KEY,
              );

          if (
            isValidTheme(
              stored,
            )
          ) {
            resolvedTheme =
              stored;
          }
        } catch (
          storageError
        ) {
          console.warn(
            "[THEME] No se pudo leer localStorage.",
            storageError,
          );
        }
      }

      applyThemeToDocument(
        resolvedTheme,
      );

      const frame =
        window.requestAnimationFrame(
          () => {
            setThemeState(
              resolvedTheme,
            );

            setMounted(
              true,
            );
          },
        );

      return () => {
        window.cancelAnimationFrame(
          frame,
        );
      };
    },
    [],
  );

  const setTheme =
    useCallback(
      (
        nextTheme:
          AppTheme,
      ) => {
        applyThemeToDocument(
          nextTheme,
        );

        setThemeState(
          nextTheme,
        );

        try {
          window.localStorage
            .setItem(
              THEME_STORAGE_KEY,
              nextTheme,
            );
        } catch (
          storageError
        ) {
          console.warn(
            "[THEME] No se pudo guardar el tema.",
            storageError,
          );
        }
      },
      [],
    );

  const toggleTheme =
    useCallback(
      () => {
        setTheme(
          theme ===
            "light"
            ? "dark"
            : "light",
        );
      },
      [
        theme,
        setTheme,
      ],
    );

  const value =
    useMemo<ThemeContextValue>(
      () => ({
        theme,

        mounted,

        setTheme,

        toggleTheme,
      }),
      [
        theme,
        mounted,
        setTheme,
        toggleTheme,
      ],
    );

  return (
    <ThemeContext.Provider
      value={
        value
      }
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(
      ThemeContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useTheme debe utilizarse dentro de ThemeProvider.",
    );
  }

  return context;
}