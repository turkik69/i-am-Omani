(() => {
  // Only use locality names that occur under one wilayat in the application's directory.
  function build(wilayat, limit = 4) {
    const directory = window.OMAN_VILLAGES || {};
    const target = directory[wilayat];
    if (!Array.isArray(target)) return [];
    const owners = new Map();
    Object.entries(directory).forEach(([w, places]) => places.forEach(place => {
      const name = place.trim();
      if (!owners.has(name)) owners.set(name, new Set());
      owners.get(name).add(w);
    }));
    const unique = places => places.filter(place => owners.get(place)?.size === 1);
    const local = unique(target);
    const other = Object.entries(directory)
      .filter(([w]) => w !== wilayat)
      .flatMap(([, places]) => unique(places));
    if (local.length < 2 || other.length < 6) return [];
    const questions = [];
    for (let i = 0; i < Math.min(limit, local.length); i++) {
      const answer = local[i];
      const choices = [answer];
      for (let j = 0; choices.length < 4 && j < other.length; j++) {
        const candidate = other[(i * 17 + j * 11) % other.length];
        if (!choices.includes(candidate)) choices.push(candidate);
      }
      if (choices.length !== 4) break;
      const correct = i % 4;
      const options = [...choices.slice(1)];
      options.splice(correct, 0, answer);
      questions.push({
        question: `أيّ من هذه المناطق تتبع ولاية ${wilayat}؟`,
        options, correct, category: `مناطق ولاية ${wilayat}`
      });
    }
    return questions;
  }
  window.OMANI_LOCAL_QUESTIONS = build;
})();
