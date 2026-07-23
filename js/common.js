
const ZEN = {
  load(key, fallback){ try{return JSON.parse(localStorage.getItem("zen:"+key)) ?? fallback}catch{return fallback}},
  save(key,val){ localStorage.setItem("zen:"+key,JSON.stringify(val)) },
  addStat(skill, correct){
    const stats=this.load("stats",{});
    stats[skill] ||= {correct:0,total:0};
    stats[skill].total++; if(correct) stats[skill].correct++;
    this.save("stats",stats);
  },
  star(n=1){this.save("stars",this.load("stars",0)+n)},
  complete(key){const c=this.load("completed",{});c[key]=true;this.save("completed",c)}
};
document.querySelectorAll("[data-stars]").forEach(el=>el.textContent=ZEN.load("stars",0));

