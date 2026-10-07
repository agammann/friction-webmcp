# Friction v1 scope, upgrade and recovery

Source 1.1.1 freezes one controlled task: register for General admission and a quiet-zone seat at fictional RelayConf, compare recorded visual and page-tool interactions, then repeat under fixed repair FG-PATCH-01.

The total is $94: $72 ticket, $10 seat and $12 service fee. Baseline agent completion deliberately returns only the $82 subtotal and does not require review or confirmation. The fixed repair requires the current review token and explicit confirmation, returns the full itemized result and makes the seat option easier to find. These intentional baseline differences remain part of the experiment.

Scores are calculated from retained events and outcomes. They describe this task, not general usability, cognitive effort, accessibility certification or real security risk. Example events remain labeled synthetic; mixed example and recorded pairs cannot receive a score. Caller-supplied findings and proposals require review and do not execute code.

## Before upgrading or resetting

1. Export the current report before restarting a side, loading examples, applying the repair or resetting. These actions replace the relevant runs.
2. Keep the JSON with the source version and browser/version used. It includes both traces, results, comparison and notes; active review tokens are omitted.
3. Verify the source ZIP's SHA256 against its accompanying checksums. Install with Node.js 24+ and pnpm 11.19.0 using the frozen lockfile.
4. Run a fresh controlled pair and compare its exported events with the visible score and findings. A hosted deployment requires its own acceptance check.

## Persistence and recovery

The current tab keeps live state and attempts to save it under `friction-lab-v2` in localStorage. Reload restores completed runs and an unfinished agent draft. An unfinished visual run is cancelled because its dialog controls cannot resume. Use one tab per experiment; tabs do not synchronize.

Malformed, unsupported or oversized saved state opens a fresh lab with a visible notice. Blocked or full browser storage leaves the session usable and displays a warning to export before closing. Exports retain readable evidence; **the app has no report import or backup-restore control**. Preserve exported files, inspect them independently and rerun the fixed task when browser data has been lost.

The old `friction-lab-v1` snapshot is ignored because its traces used a different evidence model. Clearing browser data removes saved state. Browser data and reports can be edited and are not a tamper-proof audit log.

## Compatibility and release gate

Ordinary browsers support the visual flow and labeled examples. Recorded agent runs require the actual experimental browser WebMCP API and a client that discovers the open page's tools. The browser flag alone does not attach an agent. The ten tools register after state restoration, withdraw on page hide and return after supported cached navigation.

Hosted acceptance remains a separate check.
