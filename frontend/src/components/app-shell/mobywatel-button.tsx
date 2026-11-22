import { Loader2, LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppState } from "@/components/app-state";

export function MObywatelButton() {
  const { user, isLoggingIn, logout, openMockSelector } = useAppState();

  if (!user) {
    return (
      <Button
        onClick={openMockSelector}
        disabled={isLoggingIn}
        className="h-10 gap-2 rounded-full bg-[#BB0A30] px-4 font-semibold text-white shadow-sm hover:bg-[#9F0828] focus-visible:outline-[#ffbf00]"
      >
        {isLoggingIn ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Smartphone className="size-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">
          {isLoggingIn ? 'Łączenie z mObywatelem…' : <>Zaloguj przez <strong>mObywatel</strong></>}
        </span>
        <span className="sm:hidden">{isLoggingIn ? 'Łączenie…' : 'Zaloguj'}</span>
        {!isLoggingIn && (
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        )}
      </Button>
    );
  }

  const initials = `${user.firstName[0] || "O"}${user.lastName[0] || "B"}`;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className="h-9 gap-2 pl-1 pr-3">
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
              {initials}
            </span>
            <span className="hidden text-sm sm:inline">
              {user.firstName} {user.lastName}
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            PESEL: {user.peselMasked}
          </p>
          <p className="text-xs text-muted-foreground">
            Zalogowano przez mObywatel (symulacja)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="mt-3 w-full gap-2"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          Wyloguj
        </Button>
      </PopoverContent>
    </Popover>
  );
}
