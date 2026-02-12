// --- AYARLAR ---
const CONFIG = {
    hourWidth: 70, 
    chartHeight: 140
};

// İkon ve Renk Haritası
const weatherCodes = {
    0: { desc: "Açık", icon: "ph-sun", color: "text-yellow-400" },
    1: { desc: "Az Bulutlu", icon: "ph-cloud-sun", color: "text-white" },
    2: { desc: "Parçalı Bulutlu", icon: "ph-cloud", color: "text-white" },
    3: { desc: "Kapalı", icon: "ph-cloud", color: "text-white" },
    45: { desc: "Sisli", icon: "ph-cloud-fog", color: "text-white" },
    51: { desc: "Çiseleme", icon: "ph-drop", color: "text-blue-300" },
    61: { desc: "Yağmur", icon: "ph-cloud-rain", color: "text-blue-400" },
    63: { desc: "Yoğun Yağmur", icon: "ph-cloud-rain", color: "text-blue-500" },
    71: { desc: "Kar", icon: "ph-snowflake", color: "text-white" },
    95: { desc: "Fırtına", icon: "ph-lightning", color: "text-yellow-400" }
};

function getCodeInfo(code) {
    if (weatherCodes[code]) return weatherCodes[code];
    if (code > 0 && code < 45) return weatherCodes[2];
    if (code >= 51 && code <= 67) return weatherCodes[61];
    if (code >= 71 && code <= 86) return weatherCodes[71];
    if (code >= 95) return weatherCodes[95];
    return weatherCodes[0];
}

// --- DİNAMİK ARKA PLAN ---
function updateBackground(isDay, code) {
    const bg = document.getElementById('bg-layer');
    let gradient = "";

    if (!isDay) {
        gradient = "linear-gradient(to bottom right, #020617, #1e1b4b, #0f172a)";
    } else {
        if (code <= 2) {
            gradient = "linear-gradient(to bottom right, #3b82f6, #2563eb, #172554)";
        } else if (code >= 50) {
            gradient = "linear-gradient(to bottom right, #475569, #334155, #1e293b)";
        } else {
            gradient = "linear-gradient(to bottom right, #64748b, #475569, #1e293b)";
        }
    }
    bg.style.background = gradient;
}

// --- DRAG SCROLL ---
function enableDragScroll() {
    const slider = document.getElementById('chart-scroll-container');
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('cursor-grabbing');
        slider.classList.remove('cursor-grab');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('cursor-grabbing');
        slider.classList.add('cursor-grab');
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('cursor-grabbing');
        slider.classList.add('cursor-grab');
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5;
        slider.scrollLeft = scrollLeft - walk;
    });
}

// --- GELİŞMİŞ GRAFİK ÇİZİMİ ---
function renderChart(hourlyData) {
    const data = hourlyData.slice(0, 24);
    const temps = data.map(d => Math.round(d.temp));
    
    const totalWidth = data.length * CONFIG.hourWidth;
    const height = CONFIG.chartHeight;
    
    const wrapper = document.getElementById('chart-wrapper');
    const svg = document.getElementById('hourly-chart');
    const labelsContainer = document.getElementById('hourly-labels');
    const rainGroup = document.getElementById('rain-bars-group');
    
    wrapper.style.width = `${totalWidth}px`;
    svg.setAttribute('width', totalWidth);
    svg.setAttribute('viewBox', `0 0 ${totalWidth} ${height}`);

    const minTemp = Math.min(...temps) - 2;
    const maxTemp = Math.max(...temps) + 2;
    const range = maxTemp - minTemp;

    const points = temps.map((t, i) => {
        const x = (i * CONFIG.hourWidth) + (CONFIG.hourWidth / 2);
        const y = height - ((t - minTemp) / range * (height - 40)) - 20; 
        return { x, y, temp: t };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) * 0.5;
        const cp1y = p0.y;
        const cp2x = p1.x - (p1.x - p0.x) * 0.5;
        const cp2y = p1.y;
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    const areaD = `${pathD} L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`;

    document.getElementById('chart-line-path').setAttribute('d', pathD);
    document.getElementById('chart-area-path').setAttribute('d', areaD);

    while(svg.lastChild && (svg.lastChild.tagName === 'circle' || svg.lastChild.tagName === 'text')) {
        svg.removeChild(svg.lastChild);
    }
    rainGroup.innerHTML = '';

    points.forEach((p, i) => {
        const rainProb = data[i].precipProb || 0;

        if (rainProb > 0) {
            const barHeight = (rainProb / 100) * 40;
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", p.x - 15);
            rect.setAttribute("y", height - barHeight);
            rect.setAttribute("width", "30");
            rect.setAttribute("height", barHeight);
            rect.setAttribute("class", "rain-bar");
            rainGroup.appendChild(rect);
        }

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", p.x);
        circle.setAttribute("cy", p.y);
        circle.setAttribute("r", "4");
        circle.setAttribute("fill", "#fff");
        circle.setAttribute("stroke", "rgba(255,255,255,0.3)");
        circle.setAttribute("stroke-width", "2");
        svg.appendChild(circle);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", p.x);
        text.setAttribute("y", p.y - 12);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "white");
        text.setAttribute("font-size", "14");
        text.setAttribute("font-weight", "600");
        text.textContent = `${p.temp}°`;
        svg.appendChild(text);
    });

    labelsContainer.innerHTML = '';
    data.forEach((d, i) => {
        const info = getCodeInfo(d.code);
        const div = document.createElement('div');
        div.className = "flex flex-col items-center justify-start pt-2";
        div.style.width = `${CONFIG.hourWidth}px`;
        div.innerHTML = `
            <span class="text-[11px] text-white/60 mb-1 font-medium">${new Date(d.time).getHours()}:00</span>
            <i class="ph-fill ${d.isDay ? info.icon : (d.code <= 2 ? 'ph-moon-stars' : info.icon)} text-xl text-white/90"></i>
            ${d.precipProb > 0 ? `<span class="text-[9px] text-blue-300 mt-1 font-bold">%${d.precipProb}</span>` : ''}
        `;
        labelsContainer.appendChild(div);
    });
}

// --- VERİ ALMA ---
async function getWeatherData(lat, lon, cityName, country) {
    const loader = document.getElementById('loader');
    loader.style.opacity = '1';
    loader.style.zIndex = '50';

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility&hourly=temperature_2m,weather_code,is_day,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
        
        const res = await fetch(url);
        const data = await res.json();

        document.getElementById('location-city').innerText = cityName;
        document.getElementById('location-country').innerText = country || "";
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

        const curr = data.current;
        const info = getCodeInfo(curr.weather_code);
        const daily = data.daily;

        document.getElementById('main-temp').innerText = Math.round(curr.temperature_2m);
        document.getElementById('weather-desc').innerText = info.desc;
        document.getElementById('feels-like').innerText = Math.round(curr.apparent_temperature) + "°";
        document.getElementById('humidity').innerText = "%" + curr.relative_humidity_2m;
        document.getElementById('wind').innerText = Math.round(curr.wind_speed_10m) + " km/s";
        
        const windIcon = document.getElementById('wind-icon');
        if(curr.wind_direction_10m) {
            windIcon.style.transform = `rotate(${curr.wind_direction_10m}deg)`;
        }

        document.getElementById('min-max').innerText = `${Math.round(daily.temperature_2m_min[0])}° / ${Math.round(daily.temperature_2m_max[0])}°`;

        const mainIcon = document.getElementById('main-icon');
        let iconColorClass = "text-white";
        if (curr.is_day && curr.weather_code === 0) {
            iconColorClass = "text-yellow-400";
        }

        mainIcon.className = `ph-fill ${curr.is_day ? info.icon : (curr.weather_code <= 2 ? 'ph-moon-stars' : info.icon)} text-[9rem] md:text-[12rem] drop-shadow-2xl animate-float opacity-90 ${iconColorClass}`;

        updateBackground(curr.is_day, curr.weather_code);

        document.getElementById('uv-index').innerText = daily.uv_index_max[0];
        document.getElementById('visibility').innerText = (curr.visibility / 1000).toFixed(1) + " km";
        document.getElementById('pressure').innerText = Math.round(curr.surface_pressure) + " hPa";
        const sunrise = new Date(daily.sunrise[0]).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
        document.getElementById('sunrise').innerText = sunrise;

        const hourlyArr = [];
        const now = new Date();
        for(let i=0; i < data.hourly.time.length; i++) {
            const t = new Date(data.hourly.time[i]);
            if (t >= now) {
                hourlyArr.push({
                    time: data.hourly.time[i],
                    temp: data.hourly.temperature_2m[i],
                    code: data.hourly.weather_code[i],
                    isDay: data.hourly.is_day[i],
                    precipProb: data.hourly.precipitation_probability[i]
                });
            }
        }
        renderChart(hourlyArr);

        const dailyList = document.getElementById('daily-list');
        dailyList.innerHTML = '';
        for(let i=1; i<7; i++) {
            const dDate = new Date(daily.time[i]);
            const dMax = Math.round(daily.temperature_2m_max[i]);
            const dMin = Math.round(daily.temperature_2m_min[i]);
            const dInfo = getCodeInfo(daily.weather_code[i]);
            
            let dIconColor = "text-white";
            if (daily.weather_code[i] === 0) dIconColor = "text-yellow-400";

            const row = document.createElement('div');
            row.className = "glass-card bg-white/5 border-white/5 rounded-xl overflow-hidden transition hover:bg-white/10";
            row.innerHTML = `
                <div class="flex items-center justify-between p-4 cursor-pointer" onclick="toggleDaily(${i})">
                    <div class="flex items-center gap-4">
                        <i class="ph-fill ${dInfo.icon} text-2xl ${dIconColor}"></i>
                        <span class="font-semibold w-24">${dDate.toLocaleDateString('tr-TR', {weekday: 'long'})}</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <div>
                            <span class="font-bold text-lg">${dMax}°</span>
                            <span class="text-white/50 text-sm ml-1">${dMin}°</span>
                        </div>
                        <i id="chevron-${i}" class="ph ph-caret-down text-white/50 chevron-icon"></i>
                    </div>
                </div>
                <div id="details-${i}" class="details-content bg-black/20">
                    <div class="flex justify-around p-4 text-center">
                        <div>
                            <span class="block text-[10px] uppercase text-white/50">Yağış</span>
                            <span class="font-bold text-blue-300">%${daily.precipitation_probability_max[i]}</span>
                        </div>
                        <div>
                            <span class="block text-[10px] uppercase text-white/50">Rüzgar</span>
                            <span class="font-bold">${Math.round(daily.wind_speed_10m_max[i])} km</span>
                        </div>
                        <div>
                            <span class="block text-[10px] uppercase text-white/50">UV</span>
                            <span class="font-bold text-orange-300">${daily.uv_index_max[i]}</span>
                        </div>
                    </div>
                </div>
            `;
            dailyList.appendChild(row);
        }

        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.zIndex = '-1';
                document.getElementById('app-content').style.opacity = '1';
                enableDragScroll();
            }, 500);
        }, 500);

    } catch (e) {
        console.error(e);
    }
}

function toggleDaily(i) {
    for (let j = 1; j < 7; j++) {
        if (j !== i) {
            const content = document.getElementById(`details-${j}`);
            const chevron = document.getElementById(`chevron-${j}`);
            if (content && content.classList.contains('open')) {
                content.classList.remove('open');
                if (chevron) chevron.style.transform = 'rotate(0deg)';
            }
        }
    }

    const currentContent = document.getElementById(`details-${i}`);
    const currentChevron = document.getElementById(`chevron-${i}`);
    currentContent.classList.toggle('open');
    currentChevron.style.transform = currentContent.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
}

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchTimer;

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const val = e.target.value.trim();
    if(val.length < 3) {
        searchResults.classList.remove('open');
        return;
    }
    searchTimer = setTimeout(async () => {
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${val}&count=5&language=tr&format=json`);
            const data = await res.json();
            searchResults.innerHTML = '';
            if(data.results) {
                data.results.forEach(city => {
                    const div = document.createElement('div');
                    div.className = "p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 flex justify-between items-center text-sm";
                    div.innerHTML = `<span>${city.name}</span><span class="text-xs text-white/50">${city.country || ''}</span>`;
                    div.onclick = () => {
                        searchInput.value = '';
                        searchResults.classList.remove('open');
                        getWeatherData(city.latitude, city.longitude, city.name, city.country);
                    };
                    searchResults.appendChild(div);
                });
                searchResults.classList.add('open');
            }
        } catch(e){}
    }, 400);
});

// Konum Alma (IP ve GPS)
function getLocationByIP() {
    if (navigator.geolocation) {
        const loader = document.getElementById('loader');
        loader.style.opacity = '1';
        loader.style.zIndex = '50';
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // BigDataCloud ile Ters Coğrafi Kodlama
                    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=tr`);
                    const data = await response.json();
                    
                    const city = data.city || data.locality || data.principalSubdivision || "Bilinmeyen Konum";
                    const country = data.countryName || "";

                    getWeatherData(lat, lon, city, country);
                } catch (error) {
                    console.error("Şehir ismi bulunamadı:", error);
                    getWeatherData(lat, lon, `${lat.toFixed(2)}, ${lon.toFixed(2)}`, ""); 
                }
            },
            (error) => {
                console.warn("GPS izni verilmedi veya hata:", error);
                fetchIPLocation();
            }
        );
    } else {
        fetchIPLocation();
    }
}

function fetchIPLocation() {
    fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => getWeatherData(data.latitude, data.longitude, data.city, data.country_name))
        .catch(() => getWeatherData(41.0082, 28.9784, "İstanbul", "Türkiye"));
}

window.addEventListener('DOMContentLoaded', fetchIPLocation);