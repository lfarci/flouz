-- Lists all transactions that have at least one duplicate,
-- grouped by hash so each transaction appears next to its twins.
SELECT
    t.hash,
    t.id,
    t.date,
    t.amount,
    t.counterparty,
    t.source_file
FROM transactions t
WHERE t.hash IN (
    SELECT hash
    FROM transactions
    GROUP BY hash
    HAVING COUNT(*) > 1
)
ORDER BY t.hash, t.id;
