const round2 = (n) => Math.round(n * 100) / 100;

// Equal-split settlement: each person's fair share is total spend / number of people.
// Whoever spent more than their share is owed the difference; whoever spent less owes it.
// Returns balances plus the minimum set of payments that settles everyone up.
function computeSettlement(people, expenses) {
  const spentByPerson = new Map(people.map((p) => [p, 0]));
  for (const e of expenses) {
    spentByPerson.set(e.person, (spentByPerson.get(e.person) || 0) + e.amount);
  }

  const total = round2([...spentByPerson.values()].reduce((s, v) => s + v, 0));
  const fairShare = people.length ? round2(total / people.length) : 0;

  const balances = people.map((person) => {
    const spent = round2(spentByPerson.get(person) || 0);
    return { person, spent, balance: round2(spent - fairShare) };
  });

  const creditors = balances.filter((b) => b.balance > 0.01).map((b) => ({ ...b })).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter((b) => b.balance < -0.01).map((b) => ({ ...b })).sort((a, b) => a.balance - b.balance);

  const payments = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = round2(Math.min(creditor.balance, -debtor.balance));
    if (amount > 0.01) {
      payments.push({ from: debtor.person, to: creditor.person, amount });
      creditor.balance = round2(creditor.balance - amount);
      debtor.balance = round2(debtor.balance + amount);
    }
    if (creditor.balance <= 0.01) ci += 1;
    if (debtor.balance >= -0.01) di += 1;
  }

  return { total, fairShare, balances, payments };
}

module.exports = { computeSettlement };
