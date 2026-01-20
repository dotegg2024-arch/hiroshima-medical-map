// 広島県医療圏リソースマップ - メインアプリケーション

class MedicalResourceMap {
  constructor() {
    this.currentRegion = null;
    this.currentView = 'region'; // 'region' or 'hospital'
    this.currentScenario = 'current';
    this.chart = null;
    this.init();
  }

  init() {
    this.renderMap();
    this.renderStats();
    this.setupEventListeners();
    // グラフは初期表示（全体）
    this.renderChart();
  }

  // 選択医療圏のグラフ更新
  updateChartForRegion(regionId) {
    const ctx = document.getElementById('population-chart');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const region = MEDICAL_DATA.regions[regionId];
    if (!region) return;

    const years = [2020, 2025, 2030, 2035, 2040];
    const populations = years.map(y => region.population[y] / 10000);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years.map(y => y + '年'),
        datasets: [{
          label: `${region.name}医療圏 人口推移（万人）`,
          data: populations,
          borderColor: region.color,
          backgroundColor: region.color + '33',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#94A3B8',
              font: { family: "'Noto Sans JP', sans-serif", size: 12 }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94A3B8' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#94A3B8',
              callback: (value) => value + '万'
            }
          }
        }
      }
    });
  }

  // SVGマップを描画
  renderMap() {
    const mapContainer = document.getElementById('map-container');

    // 広島県の医療圏をSVGパスで描画（簡略化した形状）
    const mapSvg = `
      <svg viewBox="0 0 600 400" class="map-svg" id="hiroshima-map">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- 備北 -->
        <path id="region-bihoku" class="map-region" 
          d="M 280 30 L 380 30 L 400 80 L 380 140 L 300 160 L 240 120 L 250 60 Z"
          fill="${MEDICAL_DATA.regions.bihoku.color}" data-region="bihoku"/>
        
        <!-- 広島中央 -->
        <path id="region-hiroshimaChuo" class="map-region"
          d="M 300 160 L 380 140 L 420 180 L 440 250 L 380 280 L 320 250 L 280 200 Z"
          fill="${MEDICAL_DATA.regions.hiroshimaChuo.color}" data-region="hiroshimaChuo"/>
        
        <!-- 尾三 -->
        <path id="region-bisan" class="map-region"
          d="M 380 280 L 440 250 L 500 270 L 520 320 L 480 360 L 400 340 L 360 300 Z"
          fill="${MEDICAL_DATA.regions.bisan.color}" data-region="bisan"/>
        
        <!-- 福山・府中 -->
        <path id="region-fukuyamaFuchu" class="map-region"
          d="M 420 180 L 520 160 L 580 200 L 580 280 L 520 320 L 500 270 L 440 250 Z"
          fill="${MEDICAL_DATA.regions.fukuyamaFuchu.color}" data-region="fukuyamaFuchu"/>
        
        <!-- 広島 -->
        <path id="region-hiroshima" class="map-region"
          d="M 100 140 L 240 120 L 300 160 L 280 200 L 320 250 L 300 320 L 200 340 L 120 280 L 80 200 Z"
          fill="${MEDICAL_DATA.regions.hiroshima.color}" data-region="hiroshima"/>
        
        <!-- 広島西 -->
        <path id="region-hiroshimaNishi" class="map-region"
          d="M 20 200 L 80 200 L 120 280 L 100 340 L 40 360 L 20 300 Z"
          fill="${MEDICAL_DATA.regions.hiroshimaNishi.color}" data-region="hiroshimaNishi"/>
        
        <!-- 呉 -->
        <path id="region-kure" class="map-region"
          d="M 200 340 L 300 320 L 340 370 L 300 400 L 200 400 L 160 370 Z"
          fill="${MEDICAL_DATA.regions.kure.color}" data-region="kure"/>
        
        <!-- 医療圏ラベル -->
        <text x="310" y="100" class="region-label" fill="white" font-size="12" text-anchor="middle">備北</text>
        <text x="360" y="220" class="region-label" fill="white" font-size="12" text-anchor="middle">広島中央</text>
        <text x="440" y="310" class="region-label" fill="white" font-size="12" text-anchor="middle">尾三</text>
        <text x="520" y="230" class="region-label" fill="white" font-size="12" text-anchor="middle">福山・府中</text>
        <text x="180" y="240" class="region-label" fill="white" font-size="14" text-anchor="middle" font-weight="bold">広島</text>
        <text x="60" y="280" class="region-label" fill="white" font-size="11" text-anchor="middle">広島西</text>
        <text x="250" y="370" class="region-label" fill="white" font-size="12" text-anchor="middle">呉</text>
      </svg>
    `;

    mapContainer.innerHTML = mapSvg;

    // マップ凡例を追加
    this.renderMapLegend();
  }

  renderMapLegend() {
    const legendContainer = document.getElementById('map-legend');
    const regions = MEDICAL_DATA.regions;

    let legendHTML = '';
    for (const [key, region] of Object.entries(regions)) {
      legendHTML += `
        <div class="legend-item" data-region="${key}">
          <span class="legend-color" style="background: ${region.color}"></span>
          <span>${region.name}</span>
        </div>
      `;
    }
    legendContainer.innerHTML = legendHTML;
  }

  // 県全体の統計を表示
  renderStats() {
    const stats = MEDICAL_DATA.prefectureStats;
    const popChange = ((stats.totalPopulation2040 - stats.totalPopulation2020) / stats.totalPopulation2020 * 100).toFixed(1);

    document.getElementById('prefecture-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${(stats.totalPopulation2020 / 10000).toFixed(0)}万</div>
        <div class="stat-label">総人口（2020年）</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${(stats.totalPopulation2040 / 10000).toFixed(1)}万</div>
        <div class="stat-label">推計人口（2040年）</div>
        <span class="stat-change negative">${popChange}%</span>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalBeds2023.toLocaleString()}</div>
        <div class="stat-label">県内総病床数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.avgTransportTime2022}分</div>
        <div class="stat-label">平均搬送時間</div>
      </div>
    `;
  }

  // イベントリスナーの設定
  setupEventListeners() {
    // マップ上の医療圏クリック
    document.querySelectorAll('.map-region').forEach(region => {
      region.addEventListener('click', (e) => {
        const regionId = e.target.dataset.region;
        this.selectRegion(regionId);
      });
    });

    // 凡例クリック
    document.getElementById('map-legend').addEventListener('click', (e) => {
      const item = e.target.closest('.legend-item');
      if (item) {
        this.selectRegion(item.dataset.region);
      }
    });

    // 表示切替タブ
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });

    // シナリオ切替
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scenario = e.target.dataset.scenario;
        this.selectScenario(scenario);
      });
    });
  }

  // 医療圏を選択
  selectRegion(regionId) {
    this.currentRegion = regionId;
    const region = MEDICAL_DATA.regions[regionId];

    // マップ上のアクティブ状態を更新
    document.querySelectorAll('.map-region').forEach(r => r.classList.remove('active'));
    document.querySelector(`[data-region="${regionId}"]`)?.classList.add('active');

    // Leafletマップのマーカーもハイライト
    if (window.hiroshimaMap) {
      window.hiroshimaMap.highlightRegionMarkers(regionId);
    }

    // 詳細パネルを更新
    this.renderRegionDetail(region);
    this.renderChart();
  }

  // Leafletマップからの医療圏選択（マップ連携用）
  selectRegionFromMap(regionId) {
    this.currentRegion = regionId;
    const region = MEDICAL_DATA.regions[regionId];

    // シンプルマップのアクティブ状態を更新
    document.querySelectorAll('.map-region').forEach(r => r.classList.remove('active'));
    document.querySelector(`[data-region="${regionId}"]`)?.classList.add('active');

    // 詳細パネルを更新
    this.renderRegionDetail(region);
    this.renderChart();
  }

  // 医療圏詳細を描画
  renderRegionDetail(region) {
    const panelContent = document.getElementById('detail-content');

    // 人口変化率を計算
    const popChange = ((region.population[2040] - region.population[2020]) / region.population[2020] * 100).toFixed(1);

    // 病床分布を計算
    const totalBeds = region.beds.total;
    const bedPercentages = {
      highAcute: (region.beds.highAcute / totalBeds * 100).toFixed(1),
      acute: (region.beds.acute / totalBeds * 100).toFixed(1),
      recovery: (region.beds.recovery / totalBeds * 100).toFixed(1),
      chronic: (region.beds.chronic / totalBeds * 100).toFixed(1)
    };

    // 救急搬送時間の評価
    const transportClass = region.avgTransportTime < 45 ? 'fast' : region.avgTransportTime < 50 ? 'medium' : 'slow';
    const transportPercent = Math.min((region.avgTransportTime / 70) * 100, 100);

    panelContent.innerHTML = `
      <div class="region-header">
        <span class="region-badge" style="background: ${region.color}"></span>
        <h2>${region.name}医療圏</h2>
      </div>
      
      <div class="region-municipalities">
        <p style="color: var(--text-muted); font-size: 0.875rem;">
          ${region.municipalities.join('、')}
        </p>
      </div>
      
      <!-- 統計サマリー -->
      <div class="stats-grid" style="margin-top: var(--space-lg);">
        <div class="stat-card">
          <div class="stat-value">${(region.population[2020] / 10000).toFixed(1)}万</div>
          <div class="stat-label">人口（2020）</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(region.population[2040] / 10000).toFixed(1)}万</div>
          <div class="stat-label">人口（2040）</div>
          <span class="stat-change negative">${popChange}%</span>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalBeds.toLocaleString()}</div>
          <div class="stat-label">総病床数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${region.hospitals.length}</div>
          <div class="stat-label">主要病院数</div>
        </div>
      </div>
      
      <!-- 病床機能別分布 -->
      <div style="margin-top: var(--space-lg);">
        <h3 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">病床機能別構成</h3>
        <div class="beds-distribution">
          <div class="beds-bar high-acute" style="width: ${bedPercentages.highAcute}%;" title="高度急性期: ${region.beds.highAcute}床">
            ${bedPercentages.highAcute > 10 ? bedPercentages.highAcute + '%' : ''}
          </div>
          <div class="beds-bar acute" style="width: ${bedPercentages.acute}%;" title="急性期: ${region.beds.acute}床">
            ${bedPercentages.acute}%
          </div>
          <div class="beds-bar recovery" style="width: ${bedPercentages.recovery}%;" title="回復期: ${region.beds.recovery}床">
            ${bedPercentages.recovery}%
          </div>
          <div class="beds-bar chronic" style="width: ${bedPercentages.chronic}%;" title="慢性期: ${region.beds.chronic}床">
            ${bedPercentages.chronic}%
          </div>
        </div>
        <div class="beds-legend">
          <div class="beds-legend-item"><span class="beds-legend-dot" style="background: var(--danger)"></span>高度急性期</div>
          <div class="beds-legend-item"><span class="beds-legend-dot" style="background: var(--accent)"></span>急性期</div>
          <div class="beds-legend-item"><span class="beds-legend-dot" style="background: var(--secondary)"></span>回復期</div>
          <div class="beds-legend-item"><span class="beds-legend-dot" style="background: var(--primary)"></span>慢性期</div>
        </div>
      </div>
      
      <!-- 救急搬送時間 -->
      <div class="transport-indicator">
        <div class="transport-icon">🚑</div>
        <div class="transport-time">
          <div class="transport-value">${region.avgTransportTime}分</div>
          <div class="transport-label">平均救急搬送時間</div>
          <div class="transport-bar">
            <div class="transport-bar-fill ${transportClass}" style="width: ${transportPercent}%"></div>
          </div>
        </div>
      </div>
      
      <!-- 表示切替タブ -->
      <div class="tabs" style="margin-top: var(--space-lg);">
        <button class="tab view-tab ${this.currentView === 'region' ? 'active' : ''}" data-view="region">医療圏集計</button>
        <button class="tab view-tab ${this.currentView === 'hospital' ? 'active' : ''}" data-view="hospital">個別病院</button>
      </div>
      
      <!-- タブコンテンツ -->
      <div id="tab-region" class="tab-content ${this.currentView === 'region' ? 'active' : ''}">
        ${this.renderRegionSummary(region)}
      </div>
      <div id="tab-hospital" class="tab-content ${this.currentView === 'hospital' ? 'active' : ''}">
        ${this.renderHospitalList(region)}
      </div>
    `;

    // タブイベント再設定
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view);
      });
    });
  }

  // 医療圏集計表示
  renderRegionSummary(region) {
    const bedsPerPop = (region.beds.total / region.population[2020] * 10000).toFixed(1);
    const bedsPerPop2040 = (region.beds.total / region.population[2040] * 10000).toFixed(1);

    return `
      <div style="margin-top: var(--space-md);">
        <table class="population-table">
          <thead>
            <tr>
              <th>指標</th>
              <th>2020年</th>
              <th>2040年</th>
              <th>変化</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>人口</td>
              <td>${region.population[2020].toLocaleString()}</td>
              <td>${region.population[2040].toLocaleString()}</td>
              <td style="color: var(--danger-light);">
                ${((region.population[2040] - region.population[2020]) / 1000).toFixed(0)}千人
              </td>
            </tr>
            <tr>
              <td>人口1万人あたり病床数</td>
              <td>${bedsPerPop}床</td>
              <td>${bedsPerPop2040}床</td>
              <td style="color: var(--secondary-light);">
                +${(bedsPerPop2040 - bedsPerPop).toFixed(1)}床
              </td>
            </tr>
            <tr>
              <td>高度急性期病床</td>
              <td colspan="3">${region.beds.highAcute.toLocaleString()}床</td>
            </tr>
            <tr>
              <td>急性期病床</td>
              <td colspan="3">${region.beds.acute.toLocaleString()}床</td>
            </tr>
            <tr>
              <td>回復期病床</td>
              <td colspan="3">${region.beds.recovery.toLocaleString()}床</td>
            </tr>
            <tr>
              <td>慢性期病床</td>
              <td colspan="3">${region.beds.chronic.toLocaleString()}床</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // 個別病院リスト表示
  renderHospitalList(region) {
    let html = '<div class="hospital-list" style="margin-top: var(--space-md);">';

    region.hospitals.forEach(hospital => {
      html += `
        <div class="hospital-item">
          <div class="hospital-info">
            <h4>${hospital.name}</h4>
            <span class="type-badge">${hospital.type}</span>
            <div style="margin-top: 4px; font-size: 0.75rem; color: var(--text-muted);">
              ${hospital.departments.join(' / ')}
            </div>
          </div>
          <div class="hospital-beds">
            <div class="beds-count">${hospital.beds}</div>
            <div class="beds-label">床</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  // 表示切替
  switchView(view) {
    this.currentView = view;

    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`tab-${view}`).classList.add('active');
  }

  // シナリオ選択
  selectScenario(scenarioId) {
    this.currentScenario = scenarioId;

    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scenario === scenarioId);
    });

    this.renderSimulationResult(scenarioId);
  }

  // シミュレーション結果を描画
  renderSimulationResult(scenarioId) {
    const resultContainer = document.getElementById('simulation-result');
    const scenario = MEDICAL_DATA.reorganizationScenarios.find(s => s.id === scenarioId);

    // シナリオに基づいて計算
    let totalPop2040 = 0;
    let totalBeds = 0;
    let avgTransport = 0;
    let regionCount = 0;

    if (scenarioId === 'current') {
      Object.values(MEDICAL_DATA.regions).forEach(r => {
        totalPop2040 += r.population[2040];
        totalBeds += r.beds.total;
        avgTransport += r.avgTransportTime;
        regionCount++;
      });
      avgTransport = avgTransport / regionCount; // 7医療圏の平均
    } else if (scenarioId === 'scenario1') {
      // 広島西を広島に統合 → 6医療圏
      regionCount = 6;
      Object.entries(MEDICAL_DATA.regions).forEach(([key, r]) => {
        totalPop2040 += r.population[2040];
        totalBeds += r.beds.total;
        if (key !== 'hiroshimaNishi') {
          avgTransport += r.avgTransportTime;
        }
      });
      // 統合により広域化 → 搬送時間は若干増加（+2分と仮定）
      avgTransport = (avgTransport / 6) + 2;
    } else if (scenarioId === 'scenario2') {
      // 広島西を広島に、備北を広島中央に統合 → 5医療圏
      regionCount = 5;
      Object.entries(MEDICAL_DATA.regions).forEach(([key, r]) => {
        totalPop2040 += r.population[2040];
        totalBeds += r.beds.total;
        if (key !== 'hiroshimaNishi' && key !== 'bihoku') {
          avgTransport += r.avgTransportTime;
        }
      });
      // 統合により広域化 → 搬送時間は増加（+5分と仮定）
      avgTransport = (avgTransport / 5) + 5;
    }

    const bedsPerRegion = totalBeds / regionCount;
    const popPerRegion = totalPop2040 / regionCount;

    // 評価
    const transportClass = avgTransport < 46 ? 'good' : avgTransport < 50 ? 'warning' : 'bad';
    const balanceClass = (bedsPerRegion / (popPerRegion / 10000)) > 100 ? 'good' : 'warning';

    resultContainer.innerHTML = `
      <div class="result-row">
        <span class="result-label">医療圏数</span>
        <span class="result-value">${regionCount}圏域</span>
      </div>
      <div class="result-row">
        <span class="result-label">圏域あたり平均人口（2040）</span>
        <span class="result-value">${(popPerRegion / 10000).toFixed(1)}万人</span>
      </div>
      <div class="result-row">
        <span class="result-label">圏域あたり平均病床数</span>
        <span class="result-value ${balanceClass}">${bedsPerRegion.toFixed(0)}床</span>
      </div>
      <div class="result-row">
        <span class="result-label">推定平均搬送時間</span>
        <span class="result-value ${transportClass}">${avgTransport.toFixed(1)}分</span>
      </div>
      <div class="result-row">
        <span class="result-label">人口1万人あたり病床</span>
        <span class="result-value ${balanceClass}">${(bedsPerRegion / (popPerRegion / 10000)).toFixed(1)}床</span>
      </div>
    `;
  }

  // グラフを描画（Chart.js使用）- 全医療圏の人口推移
  renderChart() {
    const ctx = document.getElementById('population-chart');
    if (!ctx) return;

    // 既存のチャートを破棄
    if (this.chart) {
      this.chart.destroy();
    }

    const years = [2020, 2025, 2030, 2035, 2040];

    // 全医療圏のデータセットを作成
    const datasets = Object.entries(MEDICAL_DATA.regions).map(([id, region]) => ({
      label: region.name,
      data: years.map(y => region.population[y] / 10000),
      borderColor: region.color,
      backgroundColor: region.color + '33',
      fill: false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    }));

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years.map(y => y + '年'),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#94A3B8',
              font: { family: "'Noto Sans JP', sans-serif", size: 11 },
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { family: "'Noto Sans JP', sans-serif" },
            bodyFont: { family: "'Noto Sans JP', sans-serif" },
            callbacks: {
              label: function (context) {
                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '万人';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94A3B8' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#94A3B8',
              callback: (value) => value + '万'
            }
          }
        }
      }
    });
  }
}

// DOMContentLoaded後に初期化
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MedicalResourceMap();
});
