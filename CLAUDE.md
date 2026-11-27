# CLAUDE.md

## Most important

- SIMPLICITY IS THE BEST AND SHOULD ALWAYS BE STRIVED FOR, LESS IS MORE.
- LESS LINES OF CODE IS BETTER, LESS LINES OF CODE IS A HEURISTIC TO AIM FOR.
- NO COMMENTS NO COMMENTS UNLESS SUPER STRICTLY NECESSARY FOR WEIRD THINGS NO COMMENTS CODE SHOULD BE SELF DOCUMENTING AND SIMPLE
- PUSH DIRECTLY TO MAIN, NO BRANCHES. KEEP COMMIT MESSAGES SIMPLE, CLEAN AND SUCCINCT.
- YOU MUST USE KEBAB CASE, LOWERCASE AND SIMPLE WORDS WHEN NAMING THINGS LIKE FILES AND VARIABLES.
- ALWAYS USE LIBRARIES AND REUSE OR FIND WELL ADOPTED MODERN LIBRARIES INSTEAD OF REINVENTING THE WHEEL.
- NEVER WRITE CODE BEFORE WE AGREE ON THE ARCHITECTURE AND TECH STACK. WALK ME THROUGH EACH PIECE AND WAIT FOR MY APPROVAL.
- FOR EVERY CONCERN (AUTH, DATA, UI, STORAGE), FIND THE WELL ADOPTED LIBRARY THAT OWNS THE WHOLE CONCERN AND PICK THE DESIGN THAT DELETES THE MOST CODE. QUESTION EVERY FILE THAT EXISTS ONLY TO GLUE THINGS TOGETHER.

## Everything else

- Work with me in a direct, simple, and well defined scoped way.
- Lead with the answer or outcome.
- Use plain language and briefly explain unfamiliar terms.
- Avoid bloated explanations, plans, formatting, and unrelated suggestions.
- Never use staccato sentences.
- Before adding complexity for a speculative or vanishingly unlikely race or security edge case, explain the concrete failure mode, likelihood, and complexity cost to the user and get their buy-in. Do not silently expand scope for theoretical robustness.
- No gratuitous text/additions or eyebrow elements. Less is more.
- Keep things simple: simple descriptions, simple comments, simple function names.
- Code should be self commenting, do not add comments unless necessary or required to reveal new knowledge.
- Keep code changes focused strictly on the requested deliverable.
- Keep tests proportional: add only simple, valuable tests for the changed behavior. Do not write unnecessary tests.
- Do not preserve backward compatibility unless necessary. Remove obsolete paths instead of
  adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current
  requirements. Avoid speculative abstractions, configuration, and
  indirection.
- Grow the system in layers. Start from the smallest version that works end
  to end, and add each new capability on top of a product that already
  works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall
  complexity or improve reliability. Do not reimplement common
  functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own
  implementation or adding packages. Do not assume a library lacks a
  capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap
  that only works for now and is meant to be replaced later.
- When reporting work, clearly state what changed, why, and how to test it.
- Explain the before and after of adding a PR or feature with a clear user-sided explanation (how it affects the user's experience) and a clear before and after technical explanation.
- Do not jump to conclusions, always do more research or ask questions if there is something not known.
- Keep control flow simple in every language.
- Follow the repository's existing cyclomatic or cognitive complexity limits. Never weaken, disable, or suppress them merely to make a change pass.
- If the repository has no configured limit, keep new or materially changed functions at cyclomatic complexity 20 or lower.
- Do not increase the complexity of an existing function already above the limit.
- Do not game the metric with trivial helpers, duplicated logic, hidden branching, or abstractions that are harder to understand.
- Keep cognitive complexity low.
- NEVER SEND A SLACK MESSAGE ON MY BEHALF.
- Use Chrome and take control when needed, but use APIs/tools/MCP over Chrome if available.
- I use NixOS. Respect Nix and NixOS, keep things deterministic, and do not clutter or litter my system. Read /etc/nixos/CLAUDE.md for more info.
- LESS IS MORE LESS IS MORE LESS IS MORE
- Keep things in one function unless composable or reusable
- Validate unknown values once at the boundary that owns them. Pass typed values inward instead of repeating typeof value === "object" and property-existence checks. Do not defensively revalidate values already guaranteed by a schema, constructor, or internal type.
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name that improves the caller.
- Avoid try/catch where possible
- Avoid using the any type
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream
- Reduce total variable count by inlining when a value is only used once.
- When a function has several validation branches or supporting details, make the main function read as the happy path and move supporting details into small helpers below it.
- Keep helpers close to the code they support, below the main export when that improves readability.
- Test actual implementation, do not duplicate logic into tests
