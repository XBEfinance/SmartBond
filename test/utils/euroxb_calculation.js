const { BN } = require('@openzeppelin/test-helpers');

function calculateInterest(timestampNow, interest, prevIndex, lastAccrualTimestamp, totalSupply) {
  const PER_YEAR = new BN('31536000000000000000000000'); // 31536000 * 10 ** 18
  if (totalSupply === 0) {
    return prevIndex;
  }

  const period = timestampNow - lastAccrualTimestamp;
  if (period < 60) {
    return prevIndex;
  }

  const interestFactor = interest.mul(new BN(period));
  return (interestFactor.mul(prevIndex).div(PER_YEAR).div(new BN(totalSupply))).add(prevIndex);
}

function balanceByTime(
  userBalance,
  userIndex,
  userTimestamp,
  expIndex,
  timestamp,
  totalSupply,
  totalActiveValue,
  maturityEnds,
  maturityAmounts,
) {
  const annualInterest = new BN('70000000000000000'); // 7 * 10 ** 16
  if (userBalance > 0 && userIndex > 0) {
    let currentTotalActiveValue = new BN(totalActiveValue);
    let currentExpIndex = new BN(expIndex);
    let currentAccrualTimestamp = userTimestamp;
    let i = 0;
    while (
      i < maturityEnds.length
      && maturityEnds[i] < timestamp
      && currentAccrualTimestamp < maturityEnds[i]) {
      currentExpIndex = calculateInterest(
        maturityEnds[i],
        annualInterest.mul(currentTotalActiveValue),
        currentExpIndex,
        currentAccrualTimestamp,
        totalSupply,
      );
      currentAccrualTimestamp = maturityEnds[i];

      currentTotalActiveValue = currentTotalActiveValue.sub(new BN(maturityAmounts[i]));
      i += 1;
    }

    currentExpIndex = calculateInterest(
      timestamp,
      annualInterest.mul(currentTotalActiveValue),
      currentExpIndex,
      currentAccrualTimestamp,
      totalSupply,
    );
    return {
      balance: ((new BN(userBalance)).mul(currentExpIndex)).div(new BN(userIndex)),
      expIndex: currentExpIndex,
    };
  }
  return {
    balance: (new BN(userBalance)),
    expIndex: new BN(expIndex),
  };
}

module.exports = {
  calculateInterest,
  balanceByTime,
};
