'use strict';

/* VENUS • Recipe Submitter (simple class ) */
class RecipeApp {
  constructor() {
    // DOM
    this.form       = document.getElementById('recipeForm');
    this.listEl     = document.getElementById('recipesList');
    this.tpl        = document.getElementById('recipeTpl');
    this.searchEl   = document.getElementById('search');
    this.dumpBtn    = document.getElementById('dumpBtn');
    this.resetBtn   = document.getElementById('resetBtn');
    this.yearEl     = document.getElementById('yr');
    this.cultureSel = document.getElementById('culture');

    // state
    this.recipes = this.load();

    // boot
    this.init();
  }

  // storage & helpers
  load() {
    try { return JSON.parse(localStorage.getItem('recipes')) || []; }
    catch (e) { return []; }
  }
  save() {
    localStorage.setItem('recipes', JSON.stringify(this.recipes));
  }
  nextId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }
  parseLines(t) {
    const out = [];
    String(t || '').split(/\r?\n/).forEach(s => {
      s = s.trim(); if (s) out.push(s);
    });
    return out;
  }

  // render
  renderList(filter) {
    const q = (filter || '').toLowerCase();
    this.listEl.textContent = '';
    const frag = document.createDocumentFragment();

    this.recipes.forEach(r => {
      const titleHit   = r.title && r.title.toLowerCase().indexOf(q) !== -1;
      const cultureHit = r.cultureLabel && r.cultureLabel.toLowerCase().indexOf(q) !== -1;
      const dietHit    = r.dietary && r.dietary.join(' ').toLowerCase().indexOf(q) !== -1;
      if (q && !(titleHit || cultureHit || dietHit)) return;

      const node = this.tpl.content.cloneNode(true);

      const li           = node.querySelector('li.recipe-card');
      const titleEl      = node.querySelector('.r-title');
      const diffEl       = node.querySelector('.r-difficulty');
      const cultureBadge = node.querySelector('.r-culture');
      const favBtn       = node.querySelector('.favBtn');
      const srcP         = node.querySelector('.r-source');
      const ingUl        = node.querySelector('.r-ingredients');
      const stepOl       = node.querySelector('.r-steps');
      const dietWrap     = node.querySelector('.r-dietary');

      li.dataset.id = r.id || '';
      titleEl.textContent = r.title || '';
      diffEl.textContent  = r.difficulty || '';
      if (cultureBadge) cultureBadge.textContent = r.cultureLabel || r.culture || '—';

      favBtn.setAttribute('aria-pressed', r.favorite ? 'true' : 'false');
      favBtn.textContent = r.favorite ? '★' : '☆';

      if (r.sourceName || r.sourceUrl) {
        const a = document.createElement('a');
        a.textContent = r.sourceName || r.sourceUrl;
        if (r.sourceUrl) a.href = r.sourceUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        srcP.append('Source: ', a);
      } else {
        srcP.textContent = 'Source: —';
      }

      (r.ingredients || []).forEach(ing => {
        const li2 = document.createElement('li');
        li2.textContent = ing;
        ingUl.appendChild(li2);
      });
      (r.steps || []).forEach(step => {
        const li3 = document.createElement('li');
        li3.textContent = step;
        stepOl.appendChild(li3);
      });

      if (dietWrap && r.dietary && r.dietary.length) {
        r.dietary.forEach(tag => {
          const s = document.createElement('span');
          s.className = 'badge';
          s.textContent = tag;
          dietWrap.appendChild(s);
        });
      }

      frag.appendChild(node);
    });

    this.listEl.appendChild(frag);
  }

  // events
  bindEvents() {
    // create/save
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = (this.form.title.value || '').trim();
      if (title.length < 3) {
        const help = document.getElementById('titleHelp');
        if (help) help.textContent = 'Title must be at least 3 characters.';
        this.form.title.focus();
        return;
      } else {
        const help = document.getElementById('titleHelp');
        if (help) help.textContent = '';
      }

      // culture (label + value)
      let cultureValue = '';
      let cultureLabel = '';
      if (this.cultureSel) {
        cultureValue = this.cultureSel.value;
        if (!cultureValue) {
          const ch = document.getElementById('cultureHelp');
          if (ch) ch.textContent = 'Please choose a culture.';
          this.cultureSel.focus();
          return;
        }
        if (this.cultureSel.selectedIndex >= 0) {
          const opt = this.cultureSel.options[this.cultureSel.selectedIndex];
          if (opt) cultureLabel = opt.text;
        }
      }

      // dietary (optional)
      const dietary = [];
      document.querySelectorAll('input[name="dietary"]:checked').forEach(box => {
        const span = box.nextElementSibling;
        dietary.push(span ? span.textContent : box.value);
      });

      const rec = {
        id: this.nextId(),
        title: title,
        difficulty: this.form.difficulty.value,
        ingredients: this.parseLines(this.form.ingredients.value),
        steps: this.parseLines(this.form.steps.value),
        sourceName: (this.form.sourceName.value || '').trim(),
        sourceUrl: (this.form.sourceUrl.value || '').trim(),
        culture: cultureValue,
        cultureLabel: cultureLabel,
        dietary: dietary,
        favorite: false,
        createdAt: Date.now()
      };

      this.recipes.unshift(rec);
      this.save();
      this.renderList(this.searchEl.value);
      this.form.reset();

      const listSection = document.getElementById('list-section');
      if (listSection && listSection.scrollIntoView) {
        listSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // favorite / delete 
    this.listEl.addEventListener('click', (e) => {
      const card = e.target.closest && e.target.closest('li.recipe-card');
      if (!card) return;
      const id = card.dataset.id;
      const i  = this.recipes.findIndex(r => r.id === id);
      if (i === -1) return;

      if (e.target.classList.contains('favBtn')) {
        this.recipes[i].favorite = !this.recipes[i].favorite;
        this.save();
        this.renderList(this.searchEl.value);
        return;
      }

      if (e.target.classList.contains('deleteBtn')) {
        if (window.confirm('Delete this recipe?')) {
          this.recipes.splice(i, 1);
          this.save();
          card.remove();
        }
      }
    });

    // search
    this.searchEl.addEventListener('input', (e) => {
      this.renderList(e.target.value);
    });

 
    // export
    this.dumpBtn.addEventListener('click', () => {
      const data = JSON.stringify(this.recipes, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'recipes.json'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  // init
  init() {
    if (this.yearEl) this.yearEl.textContent = new Date().getFullYear();
    this.renderList();
    this.bindEvents();
  }
}

// start
new RecipeApp();
