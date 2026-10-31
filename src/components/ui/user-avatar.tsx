"use client";

import * as React from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
  fallbackClassName?: string;
  showInitials?: boolean;
  fallbackText?: string;
  icon?: React.ReactNode;
}

export const UserAvatar = React.forwardRef<HTMLDivElement, UserAvatarProps>(
  (
    {
      src,
      alt,
      name,
      className,
      imageClassName,
      iconClassName,
      fallbackClassName,
      showInitials = false,
      fallbackText,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const [hasError, setHasError] = React.useState(false);

    // Reset error when src changes
    React.useEffect(() => {
      setHasError(false);
    }, [src]);

    const cleanSrc =
      src && typeof src === "string" && src.trim() !== "" && src !== "null" && src !== "undefined"
        ? src.trim()
        : null;

    const shouldShowImage = Boolean(cleanSrc && !hasError);

    // Initial calculation if initials are explicitly enabled
    const initial =
      fallbackText?.trim() ||
      (name ? name.trim().charAt(0).toUpperCase() : null);

    return (
      <div
        ref={ref}
        data-slot="user-avatar"
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted select-none text-muted-foreground",
          className
        )}
        title={name || alt || undefined}
        {...props}
      >
        {shouldShowImage ? (
          <img
            src={cleanSrc!}
            alt={alt || name || "User avatar"}
            onError={() => setHasError(true)}
            className={cn("size-full object-cover", imageClassName)}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : showInitials && initial ? (
          <div
            data-slot="user-avatar-initials"
            className={cn(
              "flex size-full items-center justify-center font-bold text-xs uppercase bg-muted text-muted-foreground",
              fallbackClassName
            )}
          >
            {initial}
          </div>
        ) : (
          <div
            data-slot="user-avatar-fallback"
            className={cn(
              "flex size-full items-center justify-center bg-muted text-muted-foreground",
              fallbackClassName
            )}
          >
            {icon ? (
              icon
            ) : (
              <User
                className={cn("size-1/2 text-muted-foreground stroke-[1.75]", iconClassName)}
                aria-hidden="true"
              />
            )}
          </div>
        )}
        {children}
      </div>
    );
  }
);

UserAvatar.displayName = "UserAvatar";
