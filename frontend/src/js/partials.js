export async function loadPartials() {
  const nodes = document.querySelectorAll('[data-include]');
  const tasks = Array.from(nodes).map(async (node) => {
    const path = node.getAttribute('data-include');
    if (!path) return;
    const res = await fetch(path);
    const html = await res.text();
    node.innerHTML = html;
  });
  await Promise.all(tasks);
}
