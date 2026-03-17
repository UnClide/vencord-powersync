import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Returns all power plans available on this Windows machine.
 */
export async function getPowerPlans(_frame: unknown) {
    try {
        const { stdout } = await execAsync("powercfg /l");

        // Regex is created inside the function to avoid lastIndex bugs with /g flag
        const planRegex = /GUID: ([\w-]+)\s+\((.+?)\)/g;
        const plans: { guid: string; name: string; }[] = [];
        let match;
        while ((match = planRegex.exec(stdout)) !== null) {
            plans.push({ guid: match[1], name: match[2] });
        }
        return plans;
    } catch (err: any) {
        return [];
    }
}

/**
 * Returns the GUID of the currently active power plan.
 */
export async function getActivePlan(_frame: unknown): Promise<string | null> {
    try {
        const { stdout } = await execAsync("powercfg /getactivescheme");
        const match = /GUID: ([\w-]+)/.exec(stdout);
        return match ? match[1] : null;
    } catch (err: any) {
        return null;
    }
}

/**
 * Switches the active power plan to the given GUID.
 * Returns null on success, or an error string on failure.
 * Note: _frame is the Electron IPC frame, always the first argument in Vencord native functions.
 */
export async function setPowerPlan(_frame: unknown, guid: string): Promise<string | null> {
    try {
        if (!guid || typeof guid !== "string") {
            return `Invalid GUID received: ${JSON.stringify(guid)}`;
        }

        await execAsync(`powercfg /setactive ${guid}`);

        // Read back to confirm the switch actually happened
        const { stdout } = await execAsync("powercfg /getactivescheme");
        const active = /GUID: ([\w-]+)/.exec(stdout)?.[1];

        if (active?.toLowerCase() !== guid.toLowerCase()) {
            return `Plan did not change. Active: ${active}, Expected: ${guid}`;
        }

        return null; // success
    } catch (err: any) {
        return err?.message ?? String(err);
    }
}

/**
 * Returns true if the device is currently plugged into AC power.
 * On desktops (no battery detected) always returns true.
 */
export async function isOnACPower(_frame: unknown): Promise<boolean> {
    try {
        const { stdout } = await execAsync("WMIC Path Win32_Battery Get BatteryStatus /value");

        // No battery found — assume desktop, treat as always plugged in
        if (!stdout.includes("BatteryStatus")) return true;

        // BatteryStatus=2 means AC power connected
        const match = /BatteryStatus=(\d+)/.exec(stdout);
        return match ? match[1] === "2" : true;
    } catch {
        // If WMIC fails for any reason, don't block plan switching
        return true;
    }
}