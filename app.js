(() => {
  const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const table = document.getElementById('scheduleTable');
  const tbody = table.querySelector('tbody');

  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const clearDaySelect = document.getElementById('clearDaySelect');
  const clearDayBtn = document.getElementById('clearDayBtn');
  const loginBtn = document.getElementById('loginBtn');

  const intervalSelect = document.getElementById('intervalSelect');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const rebuildBtn = document.getElementById('rebuildBtn');

  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const copyCsvBtn = document.getElementById('copyCsvBtn');

  const STORAGE_KEY = 'availability_v2';

  // init "limpiar día" options
  days.forEach((d, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = d;
    clearDaySelect.appendChild(opt);
  });

  // Helpers
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h*60 + m;
  };

  const minutesToLabel = (m) => {
    const h = Math.floor(m/60).toString().padStart(2,'0');
    const mm = (m%60).toString().padStart(2,'0');
    const next = m + currentInterval;
    const nh = Math.floor(next/60).toString().padStart(2,'0');
    const nmm = (next%60).toString().padStart(2,'0');
    return `${h}:${mm} - ${nh}:${nmm}`;
  };

  // State
  let currentInterval = parseInt(intervalSelect.value, 10);
  let startMinutes = toMinutes(startTimeInput.value);
  let endMinutes = toMinutes(endTimeInput.value);
  let isMouseDown = false;
  let dragMode = null; // true = making available, false = removing
  let lastFocusedCell = null;

  // Build table
  function buildGrid(){
    tbody.innerHTML = '';
    const rows = [];
    for(let m = startMinutes; m < endMinutes; m += currentInterval){
      const tr = document.createElement('tr');

      const timeTd = document.createElement('td');
      timeTd.textContent = minutesToLabel(m);
      timeTd.className = 'time';
      timeTd.setAttribute('role','rowheader');
      tr.appendChild(timeTd);

      for(let d = 0; d < days.length; d++){
        const td = document.createElement('td');
        td.tabIndex = 0;
        td.dataset.day = d;
        td.dataset.minute = m;
        td.setAttribute('role','gridcell');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      rows.push(tr);
    }
    // restore from storage if exists
    applyAvailability(loadFromStorage());
  }

  // Storage
  function saveToStorage(map){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      interval: currentInterval,
      start: startMinutes,
      end: endMinutes,
      data: map
    }));
    alert('¡Disponibilidad guardada con éxito!');
  }

  function loadFromStorage(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {};
    try{
      const parsed = JSON.parse(raw);
      // if configuration changed, keep only data; grid will adapt
      return parsed.data || {};
    }catch(e){ return {}; }
  }

  function collectAvailability(){
    const map = {};
    tbody.querySelectorAll('td.available').forEach(td=>{
      const key = `${td.dataset.day}-${td.dataset.minute}`;
      map[key] = true;
    });
    return map;
  }

  function applyAvailability(map){
    if(!map) return;
    Object.keys(map).forEach(key=>{
      if(!map[key]) return;
      const [day, minute] = key.split('-');
      const cell = tbody.querySelector(`td[data-day="${day}"][data-minute="${minute}"]`);
      if(cell) cell.classList.add('available');
    });
  }

  // Events: painting
  function toggleCell(td, force){
    if(!td || !('day' in td.dataset)) return;
    if(force === true){ td.classList.add('available'); return; }
    if(force === false){ td.classList.remove('available'); return; }
    td.classList.toggle('available');
  }

  tbody.addEventListener('mousedown', (e)=>{
    const td = e.target.closest('td');
    if(!td || !('day' in td.dataset)) return;
    isMouseDown = true;
    dragMode = !td.classList.contains('available'); // if empty -> we will fill
    toggleCell(td, dragMode);
    e.preventDefault();
  });

  tbody.addEventListener('mouseover', (e)=>{
    if(!isMouseDown) return;
    const td = e.target.closest('td');
    if(!td || !('day' in td.dataset)) return;
    toggleCell(td, dragMode);
  });

  document.addEventListener('mouseup', ()=>{ isMouseDown = false; dragMode = null; });

  // Click (supports Shift for ranges)
  tbody.addEventListener('click', (e)=>{
    const td = e.target.closest('td');
    if(!td || !('day' in td.dataset)) return;
    if(e.shiftKey && lastFocusedCell){
      // fill rectangle between lastFocusedCell and current
      const d1 = parseInt(lastFocusedCell.dataset.day,10);
      const d2 = parseInt(td.dataset.day,10);
      const m1 = parseInt(lastFocusedCell.dataset.minute,10);
      const m2 = parseInt(td.dataset.minute,10);
      const dMin = Math.min(d1,d2), dMax = Math.max(d1,d2);
      const mMin = Math.min(m1,m2), mMax = Math.max(m1,m2);
      for(let d=dMin; d<=dMax; d++){
        for(let m=mMin; m<=mMax; m+=currentInterval){
          const cell = tbody.querySelector(`td[data-day="${d}"][data-minute="${m}"]`);
          if(cell) cell.classList.add('available');
        }
      }
    }else{
      toggleCell(td);
    }
    lastFocusedCell = td;
  });

  // Keyboard navigation & space to toggle
  tbody.addEventListener('keydown', (e)=>{
    const td = e.target.closest('td');
    if(!td || !('day' in td.dataset)) return;

    const day = parseInt(td.dataset.day,10);
    const minute = parseInt(td.dataset.minute,10);

    let target = null;
    if(e.key === ' ' || e.key === 'Enter'){
      e.preventDefault();
      toggleCell(td);
      lastFocusedCell = td;
      return;
    }
    if(e.key === 'ArrowLeft'){ target = tbody.querySelector(`td[data-day="${day-1}"][data-minute="${minute}"]`); }
    if(e.key === 'ArrowRight'){ target = tbody.querySelector(`td[data-day="${day+1}"][data-minute="${minute}"]`); }
    if(e.key === 'ArrowUp'){ target = tbody.querySelector(`td[data-day="${day}"][data-minute="${minute-currentInterval}"]`); }
    if(e.key === 'ArrowDown'){ target = tbody.querySelector(`td[data-day="${day}"][data-minute="${minute+currentInterval}"]`); }
    if(target){ target.focus(); lastFocusedCell = target; e.preventDefault(); }
  });

  // Buttons
  saveBtn.addEventListener('click', ()=>{
    saveToStorage(collectAvailability());
  });

  clearBtn.addEventListener('click', ()=>{
    if(!confirm('¿Seguro que deseas limpiar todo el horario?')) return;
    tbody.querySelectorAll('td.available').forEach(td=>td.classList.remove('available'));
    localStorage.removeItem(STORAGE_KEY);
    alert('¡Horario limpiado!');
  });

  selectAllBtn.addEventListener('click', ()=>{
    tbody.querySelectorAll('td[data-day]').forEach(td=>td.classList.add('available'));
  });

  clearDayBtn.addEventListener('click', ()=>{
    const val = clearDaySelect.value;
    if(val === '') return;
    tbody.querySelectorAll(`td[data-day="${val}"]`).forEach(td=>td.classList.remove('available'));
  });

  loginBtn.addEventListener('click', ()=> alert('Simulando inicio de sesión...'));

  // Rebuild grid with new interval/hours
  function rebuildFromInputs(){
    const s = toMinutes(startTimeInput.value);
    const e = toMinutes(endTimeInput.value);
    const step = parseInt(intervalSelect.value,10);

    if(e <= s){ alert('La hora de término debe ser posterior a la de inicio.'); return; }
    currentInterval = step; startMinutes = s; endMinutes = e;

    const previous = collectAvailability(); // try to keep matching blocks
    buildGrid();
    // approximate mapping: if interval changed, keep overlap by minute
    Object.keys(previous).forEach(key=>{
      const [d, m] = key.split('-').map(Number);
      if(m >= startMinutes && m < endMinutes){
        const aligned = Math.floor((m - startMinutes)/currentInterval)*currentInterval + startMinutes;
        const cell = tbody.querySelector(`td[data-day="${d}"][data-minute="${aligned}"]`);
        if(cell) cell.classList.add('available');
      }
    });
  }
  rebuildBtn.addEventListener('click', rebuildFromInputs);
  intervalSelect.addEventListener('change', ()=>{/* UI only; apply on actualizar grilla */});

  // Export / Import / CSV
  exportBtn.addEventListener('click', ()=>{
    const payload = {
      meta:{ interval: currentInterval, start: startMinutes, end: endMinutes, days },
      data: collectAvailability()
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'disponibilidad.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importFile.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const json = JSON.parse(text);
      if(json.meta){
        // apply meta if user desea; aquí las aplicamos
        currentInterval = json.meta.interval || currentInterval;
        startMinutes = json.meta.start || startMinutes;
        endMinutes = json.meta.end || endMinutes;
        intervalSelect.value = String(currentInterval);
        const sh = String(Math.floor(startMinutes/60)).padStart(2,'0')+':'+String(startMinutes%60).padStart(2,'0');
        const eh = String(Math.floor(endMinutes/60)).padStart(2,'0')+':'+String(endMinutes%60).padStart(2,'0');
        startTimeInput.value = sh; endTimeInput.value = eh;
        buildGrid();
      }
      applyAvailability(json.data || {});
      alert('¡Disponibilidad importada!');
    }catch(err){
      alert('Archivo inválido.');
    }finally{
      importFile.value = '';
    }
  });

  copyCsvBtn.addEventListener('click', ()=>{
    // CSV con encabezados: Hora,Lunes,...,Domingo (1 = disp, 0 = no)
    const rows = [];
    const header = ['Hora', ...days];
    rows.push(header.join(','));
    for(let tr of tbody.rows){
      const tds = Array.from(tr.cells);
      const label = tds[0].textContent;
      const vals = tds.slice(1).map(td => td.classList.contains('available') ? '1' : '0');
      rows.push([label, ...vals].join(','));
    }
    const csv = rows.join('\n');
    navigator.clipboard.writeText(csv).then(()=> alert('CSV copiado al portapapeles'));
  });

  // Initial render
  buildGrid();
})();