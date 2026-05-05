# Budget set mode design

## Problem

`flouz budget set` now supports both interactive entry and top-level default allocation, but the command modes are not clearly separated. The allocation flags need deterministic behavior that matches user expectations and stays easy to validate and test.

## Goals

- Keep the current single-category budget flow unchanged
- Support partial top-level allocation overrides with default fallback values
- Keep command modes unambiguous
- Cover the new branches with action tests so coverage passes again

## Non-goals

- Changing the budget storage model
- Changing how budget values are parsed or formatted
- Adding new top-level allocation categories beyond necessities, discretionary, and savings

## Command modes

### Direct mode

Direct mode keeps the current behavior and always writes one budget row.

Supported invocations:

- `flouz budget set necessities 500`
- `flouz budget set necessities`
- `flouz budget set`

Behavior:

- If both positional arguments are present, use them directly
- If the category is missing, prompt for a top-level category
- If the amount is missing, prompt for the budget value
- If both are missing, prompt for category first and amount second

### Default allocation mode

Default allocation mode is entered only when the command is exactly:

- `flouz budget set --defaults`

Behavior:

- Apply the built-in defaults for necessities, discretionary, and savings
- Write one row for each of those three top-level categories

### Custom allocation mode

Custom allocation mode is entered when one or more of these flags are explicitly provided:

- `--necessities`
- `--discretionary`
- `--savings`

Supported invocations:

- `flouz budget set --necessities 40%`
- `flouz budget set --necessities 40% --savings 25%`
- `flouz budget set --discretionary 35% --savings 15%`

Behavior:

- Any omitted allocation category falls back to the existing built-in default value
- The command writes one row for each of necessities, discretionary, and savings

## Validation rules

- `--defaults` must be used on its own
- `--defaults` cannot be combined with positional `[category] [amount]`
- `--defaults` cannot be combined with `--necessities`, `--discretionary`, or `--savings`
- Custom allocation flags cannot be combined with positional `[category] [amount]`
- If no allocation flags are provided, the command stays in direct mode

## Implementation shape

`src/commands/budget/set.ts` should resolve the command mode before opening the main execution flow:

1. Validate the target month
2. Detect whether allocation flags were explicitly provided
3. Resolve one of three modes: direct, defaults, or custom allocation
4. Run the existing direct flow unchanged, or dispatch to allocation helpers

The command should keep using the existing `applyDefaultAllocation` helper. Custom allocation mode should build the same options object shape, but fill missing values from `DEFAULT_NECESSITIES`, `DEFAULT_DISCRETIONARY`, and `DEFAULT_SAVINGS` before calling the shared allocation helper.

## Testing

Add command action coverage for:

- `--defaults` on its own
- A single allocation override with default fallback values for omitted categories
- Multiple allocation overrides together
- `--defaults` mixed with allocation flags
- Allocation flags mixed with positional arguments
- The existing direct positional flow
- The existing interactive direct flow
- Interactive cancellation paths that were added in this feature

## Expected outcome

The command will have three explicit, predictable modes:

- direct mode for one category
- default allocation mode for the built-in split
- custom allocation mode for partial overrides with default fallback

This keeps the UX clear and removes the current ambiguity around allocation flags.
