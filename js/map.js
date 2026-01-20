// 広島県医療圏リソースマップ - Leaflet地図モジュール
// 市区町村GeoJSONをAPIから取得して医療圏ごとに表示

class HiroshimaMap {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.markers = [];
    this.regionLayers = {};
    this.municipalityLayers = [];
    this.currentRegion = null;

    this.center = [34.45, 132.85];
    this.defaultZoom = 9;

    // 市区町村から医療圏へのマッピング
    this.municipalityToRegion = MEDICAL_DATA.municipalityMapping;

    // 市区町村名リスト（GeoJSON取得用）
    this.municipalities = [
      // 広島圏域
      "広島市中区", "広島市東区", "広島市南区", "広島市西区",
      "広島市安佐南区", "広島市安佐北区", "広島市安芸区", "広島市佐伯区",
      "安芸高田市", "府中町", "海田町", "熊野町", "坂町", "安芸太田町", "北広島町",
      // 広島西圏域
      "大竹市", "廿日市市",
      // 呉圏域
      "呉市", "江田島市",
      // 広島中央圏域
      "東広島市", "竹原市", "大崎上島町",
      // 尾三圏域
      "三原市", "尾道市", "世羅町",
      // 福山・府中圏域
      "福山市", "府中市", "神石高原町",
      // 備北圏域
      "三次市", "庄原市"
    ];

    this.init();
  }

  async init() {
    // Leafletマップ初期化
    this.map = L.map(this.containerId, {
      center: this.center,
      zoom: this.defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // タイルレイヤー（OpenStreetMap）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(this.map);

    // ローディング表示
    this.showLoading('市区町村境界を読み込み中...');

    // 市区町村GeoJSONを取得
    await this.loadMunicipalityBoundaries();

    // 病院マーカーを追加
    this.addHospitalMarkers();

    // 凡例追加
    this.addLegend();

    // ローディング非表示
    this.hideLoading();

    // 初期サイドパネル表示
    this.updateSidePanel(null);
  }

  showLoading(message) {
    const container = document.getElementById(this.containerId);
    if (container) {
      const loading = document.createElement('div');
      loading.id = 'map-loading';
      loading.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:rgba(255,255,255,0.95);padding:24px 40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);display:flex;align-items:center;gap:16px;font-family:"Noto Sans JP",sans-serif;';
      loading.innerHTML = `
        <div style="width:28px;height:28px;border:3px solid #4F46E5;border-radius:50%;border-top-color:transparent;animation:spin 1s linear infinite;"></div>
        <span style="font-size:14px;color:#1e293b;font-weight:500;">${message}</span>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
      container.style.position = 'relative';
      container.appendChild(loading);
    }
  }

  hideLoading() {
    const loading = document.getElementById('map-loading');
    if (loading) loading.remove();
  }

  async loadMunicipalityBoundaries() {
    // uedayou.net APIから市区町村GeoJSONを取得
    const fetchPromises = this.municipalities.map(async (name) => {
      try {
        // 府中市は「広島県府中市」として取得（東京都府中市との混同回避）
        const fullName = name === '府中市' ? '広島県府中市' : name;
        const encodedName = encodeURIComponent(fullName);
        const url = `https://uedayou.net/loa/${encodedName}.geojson`;

        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to fetch: ${name}`);
          return null;
        }

        const geojson = await response.json();
        return { name, geojson };
      } catch (error) {
        console.warn(`Error fetching ${name}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);

    // 取得成功したデータを地図に追加
    const successful = results.filter(r => r !== null);
    console.log(`Loaded ${successful.length}/${this.municipalities.length} municipalities`);

    // 医療圏ごとにグループ化
    const regionGroups = {};

    successful.forEach(({ name, geojson }) => {
      const regionId = this.municipalityToRegion[name];
      if (!regionId) {
        console.warn(`No region mapping for: ${name}`);
        return;
      }

      if (!regionGroups[regionId]) {
        regionGroups[regionId] = [];
      }

      const region = MEDICAL_DATA.regions[regionId];
      if (!region) return;

      try {
        const layer = L.geoJSON(geojson, {
          style: {
            color: region.color,
            weight: 2,
            opacity: 0.8,
            fillColor: region.color,
            fillOpacity: 0.35
          },
          onEachFeature: (feature, layer) => {
            // ツールチップ
            layer.bindTooltip(`<strong>${name}</strong><br><span style="color:${region.color}">${region.name}医療圏</span>`, {
              sticky: true,
              className: 'municipality-tooltip'
            });

            // クリックイベント
            layer.on('click', () => {
              this.selectRegion(regionId);
            });

            // ホバーイベント
            layer.on('mouseover', (e) => {
              if (this.currentRegion !== regionId) {
                e.target.setStyle({ weight: 4, fillOpacity: 0.5 });
              }
            });

            layer.on('mouseout', (e) => {
              if (this.currentRegion !== regionId) {
                e.target.setStyle({ weight: 2, fillOpacity: 0.35 });
              }
            });
          }
        });

        layer.addTo(this.map);
        regionGroups[regionId].push(layer);
        this.municipalityLayers.push({ layer, regionId, name });

      } catch (error) {
        console.warn(`Error adding layer for ${name}:`, error.message);
      }
    });

    // 医療圏レイヤーグループを作成
    Object.entries(regionGroups).forEach(([regionId, layers]) => {
      this.regionLayers[regionId] = L.featureGroup(layers);
    });

    // GeoJSON取得に失敗した場合の代替表示
    if (successful.length === 0) {
      console.warn('No municipality data loaded, using fallback');
      this.drawFallbackBoundaries();
    }
  }

  drawFallbackBoundaries() {
    // APIからのデータ取得に失敗した場合の代替（簡略化ポリゴン）
    const fallbackCoords = {
      hiroshima: [[34.35, 132.35], [34.60, 132.40], [34.65, 132.60], [34.50, 132.65], [34.30, 132.55], [34.35, 132.35]],
      hiroshimaNishi: [[34.15, 132.10], [34.35, 132.15], [34.40, 132.35], [34.25, 132.40], [34.15, 132.10]],
      kure: [[34.08, 132.40], [34.32, 132.45], [34.35, 132.72], [34.08, 132.70], [34.08, 132.40]],
      hiroshimaChuo: [[34.25, 132.65], [34.52, 132.70], [34.50, 133.00], [34.20, 132.95], [34.25, 132.65]],
      bisan: [[34.32, 132.95], [34.62, 133.00], [34.55, 133.25], [34.30, 133.18], [34.32, 132.95]],
      fukuyamaFuchu: [[34.35, 133.20], [34.78, 133.25], [34.75, 133.55], [34.35, 133.50], [34.35, 133.20]],
      bihoku: [[34.60, 132.65], [35.00, 132.95], [35.00, 133.35], [34.65, 133.10], [34.60, 132.65]]
    };

    Object.entries(fallbackCoords).forEach(([regionId, coords]) => {
      const region = MEDICAL_DATA.regions[regionId];
      if (!region) return;

      const polygon = L.polygon(coords, {
        color: region.color,
        weight: 3,
        opacity: 0.8,
        fillColor: region.color,
        fillOpacity: 0.35
      });

      polygon.bindTooltip(`<strong>${region.name}医療圏</strong><br>${region.municipalities.join('、')}`, {
        sticky: true,
        className: 'municipality-tooltip'
      });

      polygon.on('click', () => this.selectRegion(regionId));
      polygon.addTo(this.map);

      this.regionLayers[regionId] = L.featureGroup([polygon]);
      this.municipalityLayers.push({ layer: polygon, regionId, name: region.name });
    });
  }

  addHospitalMarkers() {
    Object.entries(MEDICAL_DATA.regions).forEach(([regionKey, region]) => {
      region.hospitals.forEach(hospital => {
        if (!hospital.lat || !hospital.lng) return;

        const minRadius = 8;
        const maxRadius = 24;
        const radius = minRadius + Math.min((hospital.beds - 100) / 700, 1) * (maxRadius - minRadius);

        let borderColor = '#ffffff';
        let borderWidth = 2;
        if (hospital.type === '特定機能' || hospital.type === '基幹') {
          borderColor = '#FFD700';
          borderWidth = 4;
        }

        const marker = L.circleMarker([hospital.lat, hospital.lng], {
          radius: Math.max(radius, 8),
          fillColor: region.color,
          color: borderColor,
          weight: borderWidth,
          fillOpacity: 0.9
        });

        marker.bindPopup(`
          <div style="min-width:220px;font-family:'Noto Sans JP',sans-serif;">
            <h3 style="margin:0 0 8px;color:${region.color};font-size:14px;font-weight:700;">${hospital.name}</h3>
            <div style="display:inline-block;background:${region.color};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-bottom:8px;">${hospital.type}</div>
            <div style="font-size:24px;font-weight:800;color:${region.color};margin:8px 0;">${hospital.beds}<span style="font-size:12px;color:#64748B;">床</span></div>
            <div style="font-size:11px;color:#475569;margin-bottom:8px;">📍 ${hospital.address}</div>
            ${hospital.url ? `<a href="${hospital.url}" target="_blank" style="font-size:11px;color:${region.color};">🔗 公式サイト</a>` : ''}
          </div>
        `, { maxWidth: 280 });

        marker.bindTooltip(`${hospital.name}<br>${hospital.beds}床`, { direction: 'top' });
        marker.addTo(this.map);
        this.markers.push({ marker, regionKey, hospital });
      });
    });
  }

  selectRegion(regionId) {
    const region = MEDICAL_DATA.regions[regionId];
    if (!region) return;

    // 全ポリゴンのスタイルを更新
    this.municipalityLayers.forEach(({ layer, regionId: rId }) => {
      if (rId === regionId) {
        layer.setStyle({ weight: 4, fillOpacity: 0.6 });
        if (layer.bringToFront) layer.bringToFront();
      } else {
        layer.setStyle({ weight: 1, fillOpacity: 0.2 });
      }
    });

    // 選択医療圏にズーム
    if (this.regionLayers[regionId]) {
      const bounds = this.regionLayers[regionId].getBounds();
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11, animate: true });
    }

    // マーカーハイライト
    this.markers.forEach(({ marker, regionKey }) => {
      if (regionKey === regionId) {
        marker.setStyle({ fillOpacity: 1 });
        marker.bringToFront();
      } else {
        marker.setStyle({ fillOpacity: 0.3 });
      }
    });

    this.currentRegion = regionId;
    this.updateSidePanel(regionId);

    if (window.app && window.app.updateChartForRegion) {
      window.app.updateChartForRegion(regionId);
    }
  }

  updateSidePanel(regionId) {
    const container = document.getElementById('all-regions-content');
    if (!container) return;

    if (!regionId) {
      container.innerHTML = this.renderAllRegionsList();
    } else {
      container.innerHTML = this.renderSelectedRegion(regionId);
    }
  }

  renderAllRegionsList() {
    let html = '<div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:18px;">地図または下のカードをクリックして医療圏を選択</div>';

    Object.entries(MEDICAL_DATA.regions).forEach(([id, region]) => {
      const popChange = ((region.population[2040] - region.population[2020]) / region.population[2020] * 100).toFixed(1);

      html += `
        <div class="region-card" style="margin-bottom:14px;padding:16px;background:var(--glass-bg);border-radius:14px;border-left:5px solid ${region.color};cursor:pointer;transition:all 0.2s;" onclick="window.hiroshimaMap && window.hiroshimaMap.selectRegion('${id}')" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='none'">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="width:16px;height:16px;border-radius:50%;background:${region.color};"></span>
              <span style="font-weight:700;font-size:1.1rem;">${region.name}医療圏</span>
            </div>
            <span style="font-size:1.3rem;font-weight:800;color:${region.color};">${region.beds.total.toLocaleString()}<span style="font-size:0.7rem;color:var(--text-muted);">床</span></span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">
            ${region.municipalities.join('、')}
          </div>
          <div style="display:flex;gap:16px;margin-top:10px;font-size:0.8rem;">
            <span>人口: <strong>${(region.population[2020] / 10000).toFixed(1)}万</strong> → <strong style="color:${region.color};">${(region.population[2040] / 10000).toFixed(1)}万</strong> <span style="color:var(--danger);">(${popChange}%)</span></span>
          </div>
        </div>
      `;
    });

    return html;
  }

  renderSelectedRegion(regionId) {
    const region = MEDICAL_DATA.regions[regionId];
    if (!region) return '';

    const popChange = ((region.population[2040] - region.population[2020]) / region.population[2020] * 100).toFixed(1);
    const sortedHospitals = [...region.hospitals].sort((a, b) => b.beds - a.beds);

    let html = `
      <div style="margin-bottom:18px;">
        <button class="btn btn-secondary" onclick="window.hiroshimaMap && window.hiroshimaMap.resetView()" style="padding:10px 18px;font-size:0.85rem;">
          ← 一覧に戻る
        </button>
      </div>
      
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
        <span style="width:26px;height:26px;border-radius:50%;background:${region.color};"></span>
        <h2 style="margin:0;font-size:1.6rem;font-weight:800;">${region.name}医療圏</h2>
      </div>
      
      <div style="font-size:0.95rem;color:var(--text-muted);margin-bottom:22px;line-height:1.6;">
        ${region.municipalities.join('、')}
      </div>
      
      <!-- 人口比較 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px;">
        <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.03);border-radius:16px;">
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">2020年 人口</div>
          <div style="font-size:2.2rem;font-weight:800;color:var(--text-secondary);">${(region.population[2020] / 10000).toFixed(1)}<span style="font-size:1rem;">万人</span></div>
        </div>
        <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.03);border-radius:16px;">
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">2040年 人口（予測）</div>
          <div style="font-size:2.2rem;font-weight:800;color:${region.color};">${(region.population[2040] / 10000).toFixed(1)}<span style="font-size:1rem;">万人</span></div>
          <div style="font-size:0.9rem;font-weight:700;color:var(--danger);margin-top:6px;">${popChange}%</div>
        </div>
      </div>
      
      <!-- 統計 -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:26px;">
        <div style="text-align:center;padding:18px;background:rgba(255,255,255,0.03);border-radius:14px;">
          <div style="font-size:2.2rem;font-weight:800;color:${region.color};">${region.beds.total.toLocaleString()}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">総病床数</div>
        </div>
        <div style="text-align:center;padding:18px;background:rgba(255,255,255,0.03);border-radius:14px;">
          <div style="font-size:2.2rem;font-weight:800;color:${region.color};">${region.hospitals.length}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">主要病院数</div>
        </div>
        <div style="text-align:center;padding:18px;background:rgba(255,255,255,0.03);border-radius:14px;">
          <div style="font-size:2.2rem;font-weight:800;color:${region.avgTransportTime < 45 ? 'var(--secondary)' : region.avgTransportTime < 50 ? 'var(--accent)' : 'var(--danger)'};">${region.avgTransportTime}<span style="font-size:1rem;">分</span></div>
          <div style="font-size:0.85rem;color:var(--text-muted);">平均搬送時間</div>
        </div>
      </div>
      
      <!-- 病床機能 -->
      <div style="margin-bottom:26px;">
        <div style="font-size:1rem;font-weight:700;color:var(--text-secondary);margin-bottom:12px;">病床機能別構成</div>
        <div style="display:flex;height:18px;border-radius:9px;overflow:hidden;background:var(--bg-tertiary);">
          <div style="width:${(region.beds.highAcute / region.beds.total * 100).toFixed(0)}%;background:var(--danger);"></div>
          <div style="width:${(region.beds.acute / region.beds.total * 100).toFixed(0)}%;background:var(--accent);"></div>
          <div style="width:${(region.beds.recovery / region.beds.total * 100).toFixed(0)}%;background:var(--secondary);"></div>
          <div style="width:${(region.beds.chronic / region.beds.total * 100).toFixed(0)}%;background:var(--primary);"></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:0.8rem;color:var(--text-muted);margin-top:10px;text-align:center;">
          <span>高度急性期<br><strong style="color:var(--danger);">${region.beds.highAcute}</strong></span>
          <span>急性期<br><strong style="color:var(--accent);">${region.beds.acute}</strong></span>
          <span>回復期<br><strong style="color:var(--secondary);">${region.beds.recovery}</strong></span>
          <span>慢性期<br><strong style="color:var(--primary);">${region.beds.chronic}</strong></span>
        </div>
      </div>
      
      <!-- 病院一覧 -->
      <div>
        <div style="font-size:1rem;font-weight:700;color:var(--text-secondary);margin-bottom:14px;">主要病院一覧（病床数順）</div>
        ${sortedHospitals.map((h, i) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;background:rgba(255,255,255,0.02);border-radius:12px;margin-bottom:10px;border-left:5px solid ${region.color};">
            <div style="display:flex;align-items:center;gap:14px;">
              <span style="font-size:1rem;color:${region.color};font-weight:800;min-width:22px;">${i + 1}</span>
              <div>
                ${h.url
        ? `<a href="${h.url}" target="_blank" style="font-size:1.05rem;font-weight:700;color:var(--text-primary);text-decoration:none;border-bottom:1px dashed var(--text-muted);">${h.name} ↗</a>`
        : `<div style="font-size:1.05rem;font-weight:700;">${h.name}</div>`
      }
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:3px;">${h.type} ｜ ${h.departments.slice(0, 3).join('・')}</div>
              </div>
            </div>
            <div style="font-size:1.5rem;font-weight:800;color:${region.color};">${h.beds}<span style="font-size:0.75rem;color:var(--text-muted);">床</span></div>
          </div>
        `).join('')}
      </div>
    `;

    return html;
  }

  addLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `
        <div style="background:#fff;padding:14px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.15);font-size:12px;color:#333;">
          <div style="font-weight:700;margin-bottom:10px;">🏥 病床数</div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
            <div style="width:16px;height:16px;border-radius:50%;background:#4F46E5;border:2px solid #fff;"></div>
            <span>~200床</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">
            <div style="width:24px;height:24px;border-radius:50%;background:#4F46E5;border:2px solid #fff;"></div>
            <span>~500床</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#4F46E5;border:2px solid #fff;"></div>
            <span>700床~</span>
          </div>
          <div style="border-top:1px solid #e2e8f0;padding-top:10px;display:flex;align-items:center;gap:8px;">
            <div style="width:16px;height:16px;border-radius:50%;background:#4F46E5;border:3px solid #FFD700;"></div>
            <span>基幹・特定機能</span>
          </div>
        </div>
      `;
      return div;
    };
    legend.addTo(this.map);
  }

  resetView() {
    // 全市区町村を元に戻す
    this.municipalityLayers.forEach(({ layer }) => {
      layer.setStyle({ weight: 2, fillOpacity: 0.35 });
    });

    this.markers.forEach(({ marker }) => {
      marker.setStyle({ fillOpacity: 0.9 });
    });

    this.map.setView(this.center, this.defaultZoom, { animate: true });
    this.currentRegion = null;
    this.updateSidePanel(null);

    if (window.app && window.app.renderChart) {
      window.app.renderChart();
    }
  }
}

// グローバル変数として公開
window.HiroshimaMap = HiroshimaMap;
