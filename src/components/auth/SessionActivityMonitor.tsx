"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

const REFRESH_INTERVAL_MS =
  60 * 1000;

const REFRESH_LOCK_NAME =
  "wallet-session-refresh";

function isProtectedRoute(
  pathname: string,
): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith(
      "/dashboard/",
    ) ||
    pathname === "/admin" ||
    pathname.startsWith(
      "/admin/",
    )
  );
}

export default function SessionActivityMonitor() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const refreshingRef =
    useRef(false);

  const lastRefreshAtRef =
    useRef(0);

  const protectedRoute =
    isProtectedRoute(
      pathname,
    );

  const refreshSession =
    useCallback(
      async (
        force = false,
      ) => {
        if (
          !protectedRoute ||
          document.visibilityState !==
            "visible" ||
          refreshingRef.current
        ) {
          return;
        }

        const now =
          Date.now();

        if (
          !force &&
          now -
            lastRefreshAtRef.current <
            REFRESH_INTERVAL_MS
        ) {
          return;
        }

        const performRefresh =
          async () => {
            refreshingRef.current =
              true;

            lastRefreshAtRef.current =
              Date.now();

            try {
              const response =
                await fetch(
                  "/api/v1/auth/refresh",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body:
                      JSON.stringify({
                        client:
                          "web",
                      }),
                    credentials:
                      "include",
                    cache:
                      "no-store",
                  },
                );

              if (
                response.status ===
                401
              ) {
                router.replace(
                  "/login",
                );

                router.refresh();
              }
            } catch (error) {
              console.error(
                "[SESSION ACTIVITY]",
                error,
              );
            } finally {
              refreshingRef.current =
                false;
            }
          };

        if (
          "locks" in
          navigator
        ) {
          await navigator.locks.request(
            REFRESH_LOCK_NAME,
            {
              ifAvailable:
                true,
            },
            async (
              lock,
            ) => {
              if (lock) {
                await performRefresh();
              }
            },
          );

          return;
        }

        await performRefresh();
      },
      [
        protectedRoute,
        router,
      ],
    );

  useEffect(
    () => {
      if (!protectedRoute) {
        return;
      }

      void refreshSession(
        true,
      );

      const handleActivity =
        () => {
          void refreshSession();
        };

      const handleVisibilityChange =
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void refreshSession(
              true,
            );
          }
        };

      const activityEvents = [
        "pointerdown",
        "keydown",
        "touchstart",
        "scroll",
      ] as const;

      for (
        const eventName
        of activityEvents
      ) {
        window.addEventListener(
          eventName,
          handleActivity,
          {
            passive: true,
          },
        );
      }

      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      return () => {
        for (
          const eventName
          of activityEvents
        ) {
          window.removeEventListener(
            eventName,
            handleActivity,
          );
        }

        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      };
    },
    [
      protectedRoute,
      refreshSession,
    ],
  );

  return null;
}