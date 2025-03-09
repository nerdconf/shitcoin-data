// Variables globales para controlar un único gráfico abierto
let currentChartContainer = null;
let currentHighlight = null;

/**
 * Muestra el contenedor flotante con la gráfica y la fila de métricas arriba.
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

    // Crear contenedor flotante
    const chartContainer = document.createElement("div");
    chartContainer.className = "chart-container-floating";
    chartContainer.id = "chartContainer";
    chartContainer.style.width = "400px"; // Increased from 320px
    chartContainer.style.padding = "12px";
    chartContainer.style.background = "#1e1e1e";
    chartContainer.style.position = "fixed"; // Changed from absolute

    // Posicionar a la derecha del texto resaltado
    const rect = highlightElement.getBoundingClientRect();
    chartContainer.style.top = `${rect.top}px`;
    chartContainer.style.left = `${rect.right + 10}px`;

    // Estructura: fila de métricas arriba y cuerpo con gráfico debajo
    chartContainer.innerHTML = `
      <div id="metricsRow" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 4px 4px 0 0;
        margin-bottom: 8px;
        font-family: Roboto, sans-serif;
      ">
        <!-- Las métricas se insertarán aquí -->
      </div>
      <div class="chart-body" style="position: relative; height: 200px;">
        <div class="spinner-overlay" style="
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        ">
          <div class="spinner" style="
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid #fff;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
          "></div>
        </div>
        <canvas id="priceChart" width="300" height="200"></canvas>
      </div>
    `;

    // Agregar el contenedor al documento
    document.body.appendChild(chartContainer);

    // Guardamos las referencias globales
    currentChartContainer = chartContainer;
    currentHighlight = highlightElement;

    // Crear la gráfica vacía
    const ctx = chartContainer.querySelector("#priceChart").getContext("2d");
    const emptyLabels = ["", "", "", "", ""];
    const emptyData = [null, null, null, null, null];

    // Guardar la instancia del gráfico para actualizarla luego
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

    // Llamada a la API para obtener datos de precios
    fetchTokenData(address, chartContainer);

    // Ajustar posición en scroll/resize
    const reposition = () => {
        const newRect = highlightElement.getBoundingClientRect();
        chartContainer.style.top = `${window.scrollY + newRect.top}px`;
        chartContainer.style.left = `${window.scrollX + newRect.right + 10}px`;
    };
    window.addEventListener("scroll", reposition);
    window.addEventListener("resize", reposition);

    // Guardar función de limpieza para remover eventos
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
            if (spinnerOverlay) spinnerOverlay.remove();

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
 * Calcula las métricas del token a partir de la respuesta de la API (dexpaprika).
 * - TVL: liquidity_usd
 * - Market Cap: (total_supply / 10^decimals) * price_usd
 * - 1h Volume: summary["1h"].volume_usd
 */
function calculateTokenMetrics(data) {
    const tvl = data.summary.liquidity_usd;
    const marketCap = (data.total_supply / Math.pow(10, data.decimals)) * data.summary.price_usd;
    const volume1h = data.summary["1h"].volume_usd;

    return {
        tvl,
        marketCap,
        volume1h,
        symbol: data.symbol
    };
}

/**
 * Formatea números con sufijo B/M.
 */
function formatNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(1) + 'B';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(1) + 'M';
    }
    return num.toFixed(1);
}

/**
 * Llama a la API de dexpaprika para obtener insights del token.
 * Se realiza vía background para evitar CORS.
 */
function fetchTokenInsights(tokenAddress) {
    const url = `https://api-beta.dexpaprika.com/networks/solana/tokens/${tokenAddress}`;
    chrome.runtime.sendMessage({ action: "fetchTokenInsights", url }, response => {
        if (response.success && response.data) {
            console.log("📊 Raw Token Data:", response.data);
            
            const metrics = calculateTokenMetrics(response.data);
            console.log("📈 Calculated Metrics:", {
                TVL: formatNumber(metrics.tvl),
                "Market Cap": formatNumber(metrics.marketCap),
                "1h Volume": formatNumber(metrics.volume1h),
                Symbol: metrics.symbol
            });

            updateChartContainer(tokenAddress, {
                tvl: metrics.tvl,
                marketCap: metrics.marketCap,
                volume1h: metrics.volume1h,
                symbol: metrics.symbol
            });
        } else {
            console.error("❌ Error fetching token insights:", response.error);
        }
    });
}

/**
 * Actualiza el contenedor del gráfico con la fila de métricas (TVL, MC, 1h Volume y BUY).
 * Se coloca en la parte superior del contenedor.
 */
function updateChartContainer(tokenAddress, data) {
    if (!currentChartContainer) return;

    // Quitar spinner si existe
    const spinnerOverlay = currentChartContainer.querySelector(".spinner-overlay");
    if (spinnerOverlay) spinnerOverlay.remove();

    // Valores recibidos o fallback
    const tvlRaw = data?.tvl ?? 905000;
    const mcRaw = data?.marketCap ?? 500000;
    const symbol = data?.symbol ?? "TICKER";
    const volume1hRaw = data?.volume1h ?? 250000;

    // Formatear a millones (puedes ajustar la función si prefieres otro formato)
    const formatToMillions = value => {
        if (typeof value !== "number" || isNaN(value)) return "N/A";
        return (value / 1_000_000).toFixed(2) + "M";
    };

    const tvl = formatToMillions(tvlRaw);
    const mc = formatToMillions(mcRaw);
    const volume1h = formatToMillions(volume1hRaw);

    // Construir HTML para la fila de métricas
    const infoHTML = `
      <div style="display: flex; align-items: center; width: 100%; gap: 2%;">
    <div style="white-space: nowrap;">
        <span style="color: white;">TVL:</span>
        <span class="highlight-44">${tvl}</span>
    </div>
    <div style="white-space: nowrap;">
        <span style="color: white;">MC:</span>
        <span class="highlight-44">${mc}</span>
    </div>
    <div style="white-space: nowrap;">
        <span style="color: white;">1h vol: ${volume1h}</span>
    </div>
    <a 
        href="https://jup.ag/limit/${tokenAddress}-USDC"
        target="_blank"
        class="buy-button"
    >
        BUY
    </a>
</div>

    `;

    // Insertar la fila de métricas en el contenedor superior
    currentChartContainer.querySelector("#metricsRow").innerHTML = infoHTML;
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
            
            console.log("🖱️ Token clicked:", word);
            showChartContainer(word, highlightedElement);
            fetchTokenInsights(word);
        }, true);
    }
}

/**
 * Escanea la página en busca de palabras de 44 caracteres (posible token address)
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

// Observer para detectar cambios en el DOM y ejecutar el escaneo
const observer = new MutationObserver(scanFor44LetterWords);
observer.observe(document.body, { childList: true, subtree: true });

// Escaneo inicial
scanFor44LetterWords();

/**
 * Cierra el gráfico al hacer clic fuera de él.
 */
document.addEventListener("click", (e) => {
    // Si no hay contenedor abierto, no se hace nada
    if (!currentChartContainer) return;

    // Si el click NO fue en el contenedor ni en el highlight, se cierra
    const clickInsideChart = currentChartContainer.contains(e.target);
    const clickOnHighlight = (e.target === currentHighlight);
    if (!clickInsideChart && !clickOnHighlight) {
        removeChartContainer();
    }
});

/* CSS para spinner (puedes incluirlo en tu CSS global)
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
*/
