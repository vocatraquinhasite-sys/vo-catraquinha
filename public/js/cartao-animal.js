/**
 * cartao-animal.js
 * ------------------------------------------------------------------
 * Renderização do card de animal, reaproveitada na home e na
 * listagem de animais, para não duplicar o mesmo HTML em dois lugares.
 * ------------------------------------------------------------------
 */
window.RÓTULOS_PORTE = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };
window.RÓTULOS_SEXO = { macho: 'Macho', femea: 'Fêmea' };
window.RÓTULOS_STATUS = { disponivel: 'Disponível', processo: 'Em processo', adotado: 'Adotado' };

window.cartaoAnimalHtml = function cartaoAnimalHtml(animal) {
  const foto = animal.fotoCapa || 'https://images.unsplash.com/photo-1601758064135-953077c46bb2?w=700';
  const nome = window.escaparHtml(animal.nome);
  const historia = animal.historia ? window.escaparHtml(animal.historia) : null;
  return `
    <article class="cartao-polaroid">
      <a href="/animal.html?id=${animal.id}" style="display:block;">
        <div class="card-animal__foto-wrap">
          <img class="card-animal__foto" src="${foto}" alt="Foto de ${nome}" loading="lazy" />
          <div class="card-animal__selo-wrap">
            <span class="selo selo--${animal.status}">${window.RÓTULOS_STATUS[animal.status] || animal.status}</span>
          </div>
        </div>
        <div class="card-animal__corpo">
          <h3 class="card-animal__nome">${nome}</h3>
          <div class="card-animal__meta">
            <span>🎂 ${animal.idade_texto || (animal.idade_anos ? animal.idade_anos + ' anos' : 'Idade não informada')}</span>
            <span>📏 ${window.RÓTULOS_PORTE[animal.porte] || animal.porte}</span>
            <span>${animal.sexo === 'femea' ? '♀️' : '♂️'} ${window.RÓTULOS_SEXO[animal.sexo] || animal.sexo}</span>
          </div>
          <p class="card-animal__historia">${historia || 'Este vovô/vovó de patinha está esperando para contar sua história pra você.'}</p>
          <span class="card-animal__link">Conhecer ${nome} →</span>
        </div>
      </a>
    </article>
  `;
};
