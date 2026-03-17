import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const RunningGameStore = findByProps("getRunningGames");

const STANDARDS = {
    BALANCED: "381b4222-f694-41f0-9685-ff5bb260df2e",
    HIGH_PERF: "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
    POWER_SAVER: "a1841308-3541-4fab-bc81-f71556f20b4a"
};

const settings = definePluginSettings({
    planMode: {
        description: "Select power plan for gaming",
        type: OptionType.SELECT,
        options: [
            { label: "High Performance", value: STANDARDS.HIGH_PERF },
            { label: "Balanced", value: STANDARDS.BALANCED },
            { label: "Power Saver", value: STANDARDS.POWER_SAVER },
            { label: "Custom (GUID)", value: "custom" }
        ],
        default: STANDARDS.HIGH_PERF
    },
    customGuid: {
        description: "Your custom GUID (if 'Custom' is selected)",
        type: OptionType.STRING,
        default: ""
    },
    blacklist: {
        description: "Ignored processes — comma-separated, e.g: spotify.exe, code.exe",
        type: OptionType.STRING,
        default: "spotify.exe, chrome.exe"
    },
    onlyOnAC: {
        description: "Only switch plan when plugged into AC power (laptops)",
        type: OptionType.BOOLEAN,
        default: false
    },
    restorePrevious: {
        description: "Restore previous plan when game closes",
        type: OptionType.BOOLEAN,
        default: true
    }
});

const state = {
    isBoosted: false,
    originalPlan: null as string | null,
    activeGames: new Set<string>()
};

// Safely extract a plain string GUID from whatever settings returns
function resolveGuid(raw: unknown): string {
    if (typeof raw === "string") return raw;
    if (typeof raw === "object" && raw !== null) return (raw as any).value ?? "";
    return String(raw ?? "");
}

async function updatePowerPlan(isGameRunning: boolean) {
    const native = (VencordNative as any).pluginHelpers?.PowerSync;

    if (!native) {
        console.error("[PowerSync] Native module not found. Available keys:", Object.keys(VencordNative));
        return;
    }

    if (isGameRunning && !state.isBoosted) {

        // Check AC power if the option is enabled
        if (settings.store.onlyOnAC) {
            const onAC: boolean = await native.isOnACPower();
            if (!onAC) {
                console.log("[PowerSync] Running on battery, skipping plan switch.");
                return;
            }
        }

        state.originalPlan = await native.getActivePlan();
        console.log("[PowerSync] Saved original plan:", state.originalPlan);

        const resolvedMode = resolveGuid(settings.store.planMode);
        const target = resolvedMode === "custom"
            ? resolveGuid(settings.store.customGuid)
            : resolvedMode;

        // Warn if custom mode is selected but no GUID was provided
        if (resolvedMode === "custom" && !target) {
            console.warn("[PowerSync] Custom mode selected but no GUID provided in settings.");
            return;
        }

        console.log("[PowerSync] Switching to plan:", target);
        const error: string | null = await native.setPowerPlan(target);

        if (error === null) {
			state.isBoosted = true;
			console.log("[PowerSync] Plan successfully applied:", target);
		} else {
			console.error("[PowerSync] setPowerPlan FAILED:", error);
		}

    } else if (!isGameRunning && state.isBoosted) {
        if (settings.store.restorePrevious && state.originalPlan) {
            console.log("[PowerSync] Restoring plan:", state.originalPlan);
            const error: string | null = await native.setPowerPlan(state.originalPlan);
            if (error === null) {
				console.log("[PowerSync] Plan restored.");
				} else {
				console.error("[PowerSync] Failed to restore plan:", error);
			}
        } else {
            console.log("[PowerSync] restorePrevious is off, skipping restore.");
        }
        state.isBoosted = false;
        state.originalPlan = null;
    }
}

function isBlacklisted(game: any): boolean {
    const blacklist = settings.store.blacklist
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);

    // Check both display name and executable name
    const displayName = (game.name ?? "").toLowerCase();
    const exeName = (game.exeName ?? "").toLowerCase();

    return blacklist.some(b => displayName.includes(b) || exeName.includes(b));
}

function handleGamesChange(event: any) {
    const added: any[] = event?.added ?? [];
    const removed: any[] = event?.removed ?? [];

    for (const game of added) {
        if (!isBlacklisted(game)) {
            state.activeGames.add(game.id);
            console.log("[PowerSync] Game added:", game.exeName);
        } else {
            console.log("[PowerSync] Game is blacklisted, skipping:", game.exeName);
        }
    }

    for (const game of removed) {
        // If we see a removal for a game we never tracked,
        // it was already running when the plugin started — skip restore
        if (!state.activeGames.has(game.id)) {
            console.log("[PowerSync] Game was running before plugin started, skipping restore:", game.exeName);
            continue;
        }
        state.activeGames.delete(game.id);
        console.log("[PowerSync] Game removed:", game.exeName);
    }

    console.log("[PowerSync] Active games count:", state.activeGames.size);
    updatePowerPlan(state.activeGames.size > 0);
}

export default definePlugin({
    name: "PowerSync",
    description: "Automatically switches Windows power plans when a game is detected.",
    authors: [{ name: "unclide", id: "395504896817758210" }],
    settings,

    start() {
        console.log("[PowerSync] Starting...");
        state.activeGames.clear();
        FluxDispatcher.subscribe("RUNNING_GAMES_CHANGE", handleGamesChange);

        // Delay initial check to allow RunningGameStore to populate.
        // On immediate call getRunningGames() returns empty even if a game is running.
        setTimeout(() => {
            const currentGames = RunningGameStore?.getRunningGames() ?? [];
            console.log("[PowerSync] Games already running at start:", currentGames.length);
            for (const game of currentGames) {
                if (!isBlacklisted(game)) state.activeGames.add(game.id);
            }
            updatePowerPlan(state.activeGames.size > 0);
        }, 1000);
    },
    stop() {
        FluxDispatcher.unsubscribe("RUNNING_GAMES_CHANGE", handleGamesChange);
        state.activeGames.clear();
        updatePowerPlan(false);
        console.log("[PowerSync] Plugin stopped.");
    }
});