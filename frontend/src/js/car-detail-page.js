import { apiGet, apiPost, apiPatch, apiDelete } from './api.js';
import { escapeHtml, toast } from './ui.js';
import { getAuth } from './auth.js';
import { isInCompare, toggleCompare } from './compare-util.js';

function getId() {
  const usp = new URLSearchParams(location.search);
  const id = Number(usp.get('id'));
  return Number.isFinite(id) ? id : null;
}

function fmtMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '-';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num);
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR');
  } catch {
    return String(iso);
  }
}

function gallery(images = []) {
  const safe = Array.isArray(images) ? images : [];
  if (!safe.length) {
    return `<div class="media"><div class="placeholder">Sin fotos</div></div>`;
  }
  const first = safe[0];
  const thumbs = safe.slice(0, 6);
  return `
    <div class="media" style="height:auto">
      <img src="${escapeHtml(first.url)}" alt="Foto" style="height:360px; object-fit:cover" />
    </div>
    <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:8px; margin-top:10px">
      ${thumbs
        .map(
          (im) => `
          <a href="${escapeHtml(im.url)}" target="_blank" rel="noreferrer" class="glass card" style="padding:0; overflow:hidden">
            <img src="${escapeHtml(im.url)}" alt="thumb" style="height:64px; width:100%; object-fit:cover" />
          </a>`
        )
        .join('')}
    </div>
  `.trim();
}

function aiBox(ai) {
  if (!ai) {
    return `<div class="glass card"><div style="font-weight:900">Análisis IA</div><div style="color:var(--text-1); margin-top:6px">Todavía no hay análisis para este auto.</div></div>`;
  }
  return `
    <div class="glass card">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
        <div style="font-weight:900">Análisis IA</div>
        <span class="chip">Condición: ${escapeHtml(ai.condition || '—')}</span>
      </div>
      <div class="kv" style="margin-top:12px">
        <div class="k">Riesgo</div><div class="v">${escapeHtml(ai.risk_level || ai.riskLevel || '—')}</div>
        <div class="k">Confianza</div><div class="v">${escapeHtml(String(ai.confidence ?? '—'))}</div>
        <div class="k">Resumen</div><div class="v">${escapeHtml(ai.summary || '—')}</div>
        <div class="k">Señales</div><div class="v">${escapeHtml((ai.signals || []).join(' • ') || '—')}</div>
      </div>
      <div style="color:var(--text-1); font-size:12px; margin-top:10px">Actualizado: ${escapeHtml(fmtDate(ai.updated_at || ai.updatedAt))}</div>
    </div>
  `.trim();
}

function qaItem(q) {
  const answers = Array.isArray(q.answers) ? q.answers : [];
  const hidden = !!q.hidden;
  return `
    <div class="glass card" data-question-id="${escapeHtml(q.id)}">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px">
        <div>
          <div style="font-weight:900">${escapeHtml(q.question)}</div>
          <div style="color:var(--text-1); font-size:12px; margin-top:6px">${escapeHtml(fmtDate(q.created_at || q.createdAt))}</div>
        </div>
        ${hidden ? '<span class="chip">Oculta</span>' : ''}
      </div>

      <div style="margin-top:10px; display:grid; gap:8px">
        ${answers
          .map(
            (a) => `
          <div class="glass" style="padding:10px; border-radius:12px">
            <div style="font-weight:700">Respuesta</div>
            <div style="color:var(--text-0); margin-top:6px">${escapeHtml(a.answer)}</div>
            <div style="color:var(--text-1); font-size:12px; margin-top:6px">${escapeHtml(fmtDate(a.created_at || a.createdAt))}</div>
          </div>`
          )
          .join('')}
      </div>

      <div class="qa-actions" style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap"></div>
    </div>
  `.trim();
}

async function loadQuestions(carId) {
  const data = await apiGet(`/cars/${carId}/questions`);
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
}

function render(root, car, questions) {
  const title = `${car.brand ?? ''} ${car.model ?? ''}`.trim() || `Auto #${car.id}`;
  const subtitle = `${car.year ?? '—'} • ${car.location ?? '—'} • ${car.mileage ?? '—'} km`;

  const auth = getAuth();
  const isOwnerSeller = !!auth?.token && auth.user?.role === 'SELLER' && String(auth.user?.sub) === String(car.seller_id);

  const inCompare = isInCompare(car.id);
  const compareLabel = inCompare ? 'Quitar de comparar' : 'Agregar a comparar';

  root.innerHTML = `
    <div class="sidebar-layout">
      <section>
        <div class="glass card">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap">
            <div>
              <div style="font-weight:900; font-size:24px">${escapeHtml(title)}</div>
              <div style="color:var(--text-1); margin-top:6px">${escapeHtml(subtitle)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:900; font-size:20px">${escapeHtml(fmtMoney(car.price))}</div>
              <div style="color:var(--text-1); font-size:12px; margin-top:6px">ID #${escapeHtml(car.id)}</div>
            </div>
          </div>

          <div style="margin-top:12px">
            ${gallery(car.images || [])}
          </div>

          <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap">
            <button class="btn" type="button" id="compareBtn">${escapeHtml(compareLabel)}</button>
            <a class="btn" href="./compare.html">Ver comparador</a>
            ${isOwnerSeller ? `<a class="btn" href="./sell-car.html?id=${encodeURIComponent(car.id)}">Editar</a>` : ''}
            ${isOwnerSeller ? `<button class="btn" type="button" id="deleteBtn">Eliminar</button>` : ''}
          </div>
        </div>

        <div class="glass card" style="margin-top:14px">
          <div style="font-weight:900">Especificaciones</div>
          <div class="kv" style="margin-top:12px">
            <div class="k">Carrocería</div><div class="v">${escapeHtml(car.bodyType || car.body_type || '—')}</div>
            <div class="k">Transmisión</div><div class="v">${escapeHtml(car.transmission || '—')}</div>
            <div class="k">Combustible</div><div class="v">${escapeHtml(car.fuel || '—')}</div>
            <div class="k">Color</div><div class="v">${escapeHtml(car.color || '—')}</div>
            <div class="k">Dueños</div><div class="v">${escapeHtml(String(car.ownersCount ?? car.owners_count ?? '—'))}</div>
          </div>
          <div style="margin-top:10px; color:var(--text-1)">${escapeHtml(car.description || '')}</div>
        </div>

        <div style="margin-top:14px">${aiBox(car.aiAnalysis || car.ai_analysis)}</div>
      </section>

      <aside>
        <div class="glass card">
          <div style="font-weight:900">Preguntas y respuestas</div>
          <div style="color:var(--text-1); margin-top:6px">Las preguntas son públicas. El vendedor puede ocultar contenido inapropiado.</div>

          <form id="askForm" style="margin-top:12px; display:grid; gap:10px">
            <label>Hacer una pregunta</label>
            <textarea name="question" rows="3" required placeholder="Ej: ¿Tiene service oficial?" ></textarea>
            <button class="btn primary" type="submit">Preguntar</button>
            <div style="color:var(--text-1); font-size:12px">Requiere cuenta de comprador.</div>
          </form>

          <div id="qaList" style="margin-top:14px; display:grid; gap:10px">
            ${questions.length ? questions.map(qaItem).join('') : '<div class="glass" style="padding:10px; border-radius:12px; color:var(--text-1)">Todavía no hay preguntas.</div>'}
          </div>
        </div>
      </aside>
    </div>
  `.trim();
}

function wireActions(carId) {
  const auth = getAuth();
  const isLogged = !!auth?.token;
  const role = auth?.user?.role;

  const compareBtn = document.getElementById('compareBtn');
  compareBtn.addEventListener('click', () => {
    const res = toggleCompare(carId);
    if (res.full) toast('error', 'Comparador', 'Podés comparar hasta 4 autos.');
    compareBtn.textContent = isInCompare(carId) ? 'Quitar de comparar' : 'Agregar a comparar';
  });

  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')) return;
      try {
        await apiDelete(`/cars/${carId}`);
        toast('success', 'Publicación', 'Eliminada.');
        location.href = './profile.html';
      } catch (e) {
        console.error(e);
        toast('error', 'Publicación', 'No se pudo eliminar.');
      }
    });
  }

  const askForm = document.getElementById('askForm');
  askForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!isLogged) {
      toast('error', 'Ingresar', 'Primero ingresá para preguntar.');
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    if (role !== 'BUYER') {
      toast('error', 'Rol', 'Solo compradores pueden preguntar.');
      return;
    }
    const fd = new FormData(askForm);
    const question = String(fd.get('question') || '').trim();
    if (!question) return;
    try {
      await apiPost(`/cars/${carId}/questions`, { question });
      toast('success', 'Q&A', 'Pregunta enviada.');
      askForm.reset();
      await refreshQA(carId);
    } catch (e) {
      console.error(e);
      toast('error', 'Q&A', 'No se pudo enviar.');
    }
  });

  document.querySelectorAll('[data-question-id]').forEach((box) => {
    const qid = Number(box.getAttribute('data-question-id'));
    const actions = box.querySelector('.qa-actions');
    if (!actions) return;

    // Seller actions: answer + hide
    if (isLogged && role === 'SELLER') {
      const answerBtn = document.createElement('button');
      answerBtn.className = 'btn';
      answerBtn.type = 'button';
      answerBtn.textContent = 'Responder';
      answerBtn.addEventListener('click', async () => {
        const answer = prompt('Escribí tu respuesta:');
        if (!answer) return;
        try {
          await apiPost(`/questions/${qid}/answer`, { answer });
          toast('success', 'Q&A', 'Respuesta publicada.');
          await refreshQA(carId);
        } catch (e) {
          console.error(e);
          toast('error', 'Q&A', 'No se pudo responder.');
        }
      });

      const hideBtn = document.createElement('button');
      hideBtn.className = 'btn';
      hideBtn.type = 'button';
      hideBtn.textContent = 'Ocultar';
      hideBtn.addEventListener('click', async () => {
        if (!confirm('¿Ocultar esta pregunta?')) return;
        try {
          await apiPatch(`/questions/${qid}/hide`, {});
          toast('success', 'Q&A', 'Pregunta oculta.');
          await refreshQA(carId);
        } catch (e) {
          console.error(e);
          toast('error', 'Q&A', 'No se pudo ocultar.');
        }
      });

      actions.appendChild(answerBtn);
      actions.appendChild(hideBtn);
    }
  });
}

async function refreshQA(carId) {
  const list = document.getElementById('qaList');
  if (!list) return;
  try {
    const questions = await loadQuestions(carId);
    list.innerHTML = questions.length ? questions.map(qaItem).join('') : '<div class="glass" style="padding:10px; border-radius:12px; color:var(--text-1)">Todavía no hay preguntas.</div>';
    wireActions(carId);
  } catch (e) {
    console.error(e);
    list.innerHTML = '<div class="glass" style="padding:10px; border-radius:12px; color:var(--text-1)">No se pudieron cargar las preguntas.</div>';
  }
}

(async function init() {
  const id = getId();
  const root = document.getElementById('detailRoot');
  if (!id) {
    root.innerHTML = '<div class="glass card">ID inválido.</div>';
    return;
  }

  try {
    const car = await apiGet(`/cars/${id}`);
    const questions = await loadQuestions(id);
    render(root, car, questions);
    wireActions(id);
  } catch (e) {
    console.error(e);
    root.innerHTML = '<div class="glass card">No se pudo cargar el detalle.</div>';
  }
})();
