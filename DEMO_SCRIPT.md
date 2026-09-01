# FrictionGlass narrated demo script

Target runtime: 2:10–2:30.

## 0:00–0:18 — The premise

“WebMCP lets a website publish structured tools from the live page. But how do we know the human interface and agent contract are equally informative, safe, and effective? FrictionGlass tests the same task through human eyes and agent tools.”

## 0:18–0:48 — Baseline human run

Show the paired lab at 50/100. Start the human run, choose general admission, and reach Attendee details.

“The person needs a quiet-zone seat, but the option is hidden under the vague label ‘More attendee needs.’ After finding it, the human receives a full review: seventy-two dollars, a ten-dollar seat, a twelve-dollar service fee, the refund condition, and an explicit confirmation.”

## 0:48–1:15 — Baseline agent run

Use the live site tools to call `start_agent_run`, `configure_registration`, and `complete_simulated_task`.

“The agent finds the structured option in seconds. But the baseline completion tool says only ‘finish and save.’ It finalizes without review and returns an eighty-two-dollar subtotal, omitting the fee and condition—even though the final state contains a ninety-four-dollar registration.”

Show the 50/100 score and two critical findings.

## 1:15–1:42 — Evidence-backed repair

Open the findings, then the patch review.

“FrictionGlass ties every proposal to trace evidence: clearer human wording, itemized result fields, a narrower confirmation schema, and an exact tool description. Agents can propose this patch, but only the visible human interface can approve it. There is no approval tool.”

Approve the patch.

## 1:42–2:14 — Repaired retest

Show the quiet-zone option immediately visible. Try to complete an agent run without review, then call `review_registration` and finish with its token and `confirmed=true`.

“Now the human option is visible. The agent is blocked until it reviews the same ninety-four-dollar total and fee policy, then confirms explicitly. Both paths mutate the same state with the same information and consent.”

Complete the human run and show 96/100.

## 2:14–2:25 — Close

“FrictionGlass turns WebMCP itself into a usability test surface—so the agent-native web can be fast without becoming less transparent.”
