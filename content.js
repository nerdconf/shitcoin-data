// Variables globales para controlar un único gráfico abierto
let currentChartContainer = null;
let currentHighlight = null;

/**
 * Muestra el contenedor flotante con la gráfica, a la derecha del texto resaltado.
 * - Si ya hay un gráfico abierto en otro highlight, lo cierra.
 * - Si se vuelve a hacer clic sobre el mismo highlight y está abierto, no se vuelve a llamar a la API.
 */
function showChartContainer(address, highlightElement) {
    // Si ya está abierto en este mismo highlight, no volvemos a cargar
    if (highlightElement === currentHighlight) {
        return;
    }

    // Cerrar cualquier contenedor previo
    removeChartContainer();

    // Crear contenedor
    const chartContainer = document.createElement("div");
    chartContainer.className = "chart-container-floating";
    chartContainer.id = "chartContainer";

    // Posicionar a la derecha del texto
    const rect = highlightElement.getBoundingClientRect();
    chartContainer.style.top = `${window.scrollY + rect.top}px`;
    chartContainer.style.left = `${window.scrollX + rect.right + 10}px`;

    document.body.appendChild(chartContainer);

    // Guardamos referencias globales
    currentChartContainer = chartContainer;
    currentHighlight = highlightElement;

    // Crear contenedor con canvas + spinner
    chartContainer.innerHTML = `
      <div class="spinner-overlay">
        <div class="spinner"></div>
      </div>
      <canvas id="priceChart" width="300" height="200"></canvas>
    `;

    // Crear la gráfica vacía (sin datos)
    const ctx = chartContainer.querySelector("#priceChart").getContext("2d");
    const emptyLabels = ["", "", "", "", ""];
    const emptyData = [null, null, null, null, null];

    // Guardamos la instancia en chartContainer para actualizar luego
    chartContainer._chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: emptyLabels,
            datasets: [{
                label: "Precio (USD)",
                data: emptyData,
                borderColor: "rgba(62, 209, 196, 1)",
                backgroundColor: "rgba(62, 209, 196, 0.2)",
                borderWidth: 2,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "#ffffff",
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "rgba(255, 255, 255, 0.8)" }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.1)" },
                    ticks: { color: "rgba(255, 255, 255, 0.8)" }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    borderWidth: 1
                }
            }
        }
    });

    // Llamada a la API
    fetchTokenData(address, chartContainer);

    // Ajustar posición en scroll/resize
    const reposition = () => {
        const newRect = highlightElement.getBoundingClientRect();
        chartContainer.style.top = `${window.scrollY + newRect.top}px`;
        chartContainer.style.left = `${window.scrollX + newRect.right + 10}px`;
    };
    window.addEventListener("scroll", reposition);
    window.addEventListener("resize", reposition);

    // Guardar referencias para limpiar eventos
    chartContainer._cleanup = () => {
        window.removeEventListener("scroll", reposition);
        window.removeEventListener("resize", reposition);
    };
}

/**
 * Elimina el contenedor flotante si existe.
 */
function removeChartContainer() {
    if (currentChartContainer) {
        if (currentChartContainer._cleanup) currentChartContainer._cleanup();
        currentChartContainer.remove();
        currentChartContainer = null;
        currentHighlight = null;
    }
}

/**
 * Llamada a la API para obtener datos de precio y dibujar la gráfica.
 */
function fetchTokenData(address, chartContainer) {
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': '994a86169ef547bba6722aefdd13f78c'
        }
    };

    // Últimas 4h
    const now = Math.floor(Date.now() / 1000);
    const timeFrom = now - 14400;
    const timeTo = now;

    fetch(`https://public-api.birdeye.so/defi/history_price?address=${address}&address_type=token&type=15m&time_from=${timeFrom}&time_to=${timeTo}`, options)
        .then(res => res.json())
        .then(res => {
            if (!res.success || !res.data || !Array.isArray(res.data.items) || res.data.items.length === 0) {
                chartContainer.textContent = "Error: sin datos";
                return;
            }

            // Quitar el spinner
            const spinnerOverlay = chartContainer.querySelector(".spinner-overlay");
            if (spinnerOverlay) {
                spinnerOverlay.remove();
            }

            // Obtener la instancia de Chart
            const chart = chartContainer._chartInstance;
            if (!chart) return;

            // Construir arrays de datos reales
            const labels = res.data.items.map(item =>
                new Date(item.unixTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            );
            const prices = res.data.items.map(item => item.value);

            // Actualizar la gráfica
            chart.data.labels = labels;
            chart.data.datasets[0].data = prices;
            chart.update();
        })
        .catch(err => {
            console.error("API Error:", err);
            chartContainer.textContent = "Error al obtener datos";
        });
}

/**
 * Crea la gráfica usando Chart.js
 */
function createChart(labels, prices) {
    const ctx = document.getElementById("priceChart").getContext("2d");
    new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Precio (USD)",
                data: prices,
                borderColor: "rgba(62, 209, 196, 1)",
                backgroundColor: "rgba(62, 209, 196, 0.2)",
                borderWidth: 2,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "#ffffff",
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "rgba(255, 255, 255, 0.8)" }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.1)" },
                    ticks: { color: "rgba(255, 255, 255, 0.8)" }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    borderWidth: 1
                }
            }
        }
    });
}

/**
 * Resalta la palabra de 44 caracteres y la hace clicable.
 */
function highlightWord(element, word) {
    if (!element || element.dataset.processed) return;

    const regex = new RegExp(`(${word})`, "g");
    element.innerHTML = element.innerHTML.replace(
        regex,
        `<span class="highlight-44">$1</span>`
    );
    element.dataset.processed = "true";

    const highlightedElement = element.querySelector(".highlight-44");
    if (highlightedElement) {
        highlightedElement.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            showChartContainer(word, highlightedElement);
        }, true);
        
    }
}

/**
 * Escanea la página en busca de palabras de 44 caracteres.
 */
function scanFor44LetterWords() {
    const tweets = document.querySelectorAll("article div[lang]:not([data-processed])");
    for (const tweet of tweets) {
        const text = tweet.innerText || tweet.textContent;
        const words = text.split(/\s+/);
        for (const word of words) {
            if (word.length === 44) {
                highlightWord(tweet, word);
                // Si deseas resaltar múltiples direcciones en el mismo tweet, quita el "return"
                return;
            }
        }
    }
}

// Observer para detectar cambios en el DOM
const observer = new MutationObserver(scanFor44LetterWords);
observer.observe(document.body, { childList: true, subtree: true });

// Escaneo inicial
scanFor44LetterWords();

/**
 * Cerrar el gráfico al hacer clic fuera de él.
 */
document.addEventListener("click", (e) => {
    // Si no hay contenedor abierto, no hacemos nada
    if (!currentChartContainer) return;

    // Si el click NO fue en el contenedor ni en el highlight, se cierra
    const clickInsideChart = currentChartContainer.contains(e.target);
    const clickOnHighlight = (e.target === currentHighlight);
    if (!clickInsideChart && !clickOnHighlight) {
        removeChartContainer();
    }
});
