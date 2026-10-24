# Production controls and refund correctness

Production entries now offer an explicit +5 button alongside normal single-unit training. Shift-click and Shift-hotkey remain available. Bulk orders are capped by available SP/MU and remaining queue space, and stop on the first authoritative failure instead of emitting repeated errors.

Prices displayed in the production panel and command card use the same nation/temporary-ability SP calculation as production validation and charging. The production panel also displays required MU. Multiplayer and hot-seat panels use the local team rather than assuming the player-side faction. Enemy production controls are hidden, and enemy queue cancellation buttons are disabled.

Queue entries are semantic buttons with visible Cancel labels, keyboard activation, and right-click compatibility. Cancelling before the first production tick correctly removes the first queued item. Multiplayer cancellation now sends and executes the selected queue index instead of always cancelling the active unit.

Each newly purchased order records its SP/MU payment. Cancellation refunds that payment even if a temporary discount expires. Receipts remain aligned when production starts, completes or cancels, and are serialized/restored with building saves. Refunds do not count as gathered income or timed-victory score.

Older saves and queues created outside ProductionSystem have no historical payment receipt. Their cancellation uses the current effective price, since the original temporary-discount history cannot be reconstructed. Exact historical refunds are guaranteed for newly recorded orders, not unrecorded legacy purchases.

Six new regression tests cover expired-discount refunds, idle/current queue cancellation, save serialization, multiplayer index preservation, bulk affordability/capacity and completion/receipt alignment. All 188 tests, controls and interface checks pass. UI behavior has not received a fresh native-browser visual review because browser automation is unavailable.

## Stable production UI

Training buttons now remain mounted while their building, faction pricing, affordability and technology availability are unchanged. Queue cancellation controls live in a permanent container in the production panel, alongside training options; selection-info refreshes no longer replace them. Progress changes only update the existing bar width. Structural queue changes rebuild the small queue and preserve focus on a remaining item in the same building. Empty queues hide their container.

Removed the duplicate unthrottled construction-availability refresh from ProductionPanel; HUD retains its existing periodic refresh. Queue SP summaries use stored payments when available, rather than undiscounted list prices.

Three additional regression tests verify 100 unchanged training refreshes without new elements, focused queue-button identity through progress updates, and focus/visibility after cancellation. The full suite passes 191 tests plus controls and interface checks. A fresh browser visual review remains unavailable.

## Consistent production shortcuts

Production keys are now defined once for the command card, training buttons, keyboard dispatcher and F1 help. G trains SPG/artillery, Y trains bombers and V trains engineers. Previously artillery was labeled Y while the keyboard handler used Y for bombers, and several labeled production shortcuts were absent from the handler.

All 17 trainable unit types have unique shortcuts. B stays construction; Q/E stays camera rotation; W/S remains camera pan; T remains the tech tree and R remains research/retreat according to selection. Production requires an owned, completed production building and no owned units in the selection. Mixed selections preserve unit-command behavior. Training is blocked while construction menus or placement mode are active, and typing, composition, repeats and Ctrl/Alt/Meta combinations are ignored. Shift requests up to five through the existing affordability/queue-capacity rules.

Four additional regression tests cover mapping consistency, reserved keys, local multiplayer/hot-seat ownership, mixed selections, typing/modifier protection and construction-mode dispatch. Full validation: 195 tests, controls and interface checks. No new visual browser review is claimed.
