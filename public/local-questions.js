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
    const governorates = window.OMAN_GOVERNORATES || {};
    const governorate = Object.keys(governorates).find(name => governorates[name].includes(wilayat));
    if (!governorate) return [];
    const questions = [];
    for (let i = 0; i < Math.min(limit, local.length); i++) {
      if (other.length < 6) break;
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
    const regions = Object.keys(governorates);
    const rest = regions.filter(name => name !== governorate);
    const needed = local.length ? 2 : limit;
    for (let i = 0; i < needed; i++) {
      const candidate = governorates[governorate][i % governorates[governorate].length];
      const correct = (i + 1) % 4;
      const options = [rest[(i * 3) % rest.length], rest[(i * 3 + 1) % rest.length], rest[(i * 3 + 2) % rest.length]];
      options.splice(correct, 0, governorate);
      questions.push({question:`في أي محافظة تقع ولاية ${candidate}؟`, options, correct, category:`محافظة ${governorate}`});
    }
    return questions;
  }
  window.OMANI_LOCAL_QUESTIONS = build;
})();
