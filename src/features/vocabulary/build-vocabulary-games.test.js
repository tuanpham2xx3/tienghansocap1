const assert = require("assert");
const { buildVocabularyGames, validateVocabularyGames } = require("./build-vocabulary-games");

const data = buildVocabularyGames();
const errors = validateVocabularyGames(data);

assert.deepStrictEqual(errors, []);
assert.strictEqual(data.version, 3);
assert.strictEqual(data.totals.lessons, 8);
assert.strictEqual(Object.keys(data.lessonPools).length, 8);
assert.ok(data.totals.items > 400);
assert.strictEqual(data.totals.imageableItems, 0);

const ids = new Set(data.items.map(item => item.id));
assert.strictEqual(ids.size, data.items.length);
assert.ok(data.items.every(item => item.lesson >= 1 && item.lesson <= 8));
assert.ok(data.items.every(item => !("example" in item)));
assert.ok(data.items.every(item => !item.isImageable && !item.imageUrl));

const practiceIds = new Set(Object.values(data.practicePool).flat());
const challengeIds = new Set([
  ...data.challengePool.marathon,
]);
assert.ok([...practiceIds].every(id => ids.has(id)));
assert.ok([...challengeIds].every(id => ids.has(id)));
assert.deepStrictEqual(Object.keys(data.challengePool), ["marathon"]);
assert.strictEqual(data.gameConfig.marathonSeconds, 45);
assert.strictEqual(data.gameConfig.marathonCorrectBonusSeconds, 5);
assert.strictEqual(data.gameConfig.marathonWrongPenaltySeconds, 3);

assert.ok(Object.values(data.lessonPools).every(pool => !("imageChoice" in pool.modes)));

const arrangedItems = data.practicePool.letterArrange.map(id => data.items.find(item => item.id === id));
assert.ok(arrangedItems.every(item => !item.isPhrase && item.korean.length <= 6));

assert.ok(!("sentenceFill" in data.practicePool));

console.log("vocabulary game data tests passed");
