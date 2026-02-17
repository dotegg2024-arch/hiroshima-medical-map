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
    this.humanIconLayer = L.layerGroup();
    this.isHumanAnimActive = false;

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
    // Hiroshima bounds for restriction
    const southWest = L.latLng(33.8, 131.8);
    const northEast = L.latLng(35.2, 133.7);
    const bounds = L.latLngBounds(southWest, northEast);

    // Leafletマップ初期化
    this.map = L.map(this.containerId, {
      center: this.center, // Fallback
      zoom: this.defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      maxBoundsViscosity: 1.0,
      minZoom: 9
    });

    // Fit to Hiroshima bounds initially (Delayed to ensure DOM render)
    setTimeout(() => {
      this.map.invalidateSize();
      const southWest = L.latLng(33.8, 131.8);
      const northEast = L.latLng(35.2, 133.7);
      const fitBounds = L.latLngBounds(southWest, northEast);
      // Strict fit with no padding to maximize view
      this.map.fitBounds(fitBounds, { padding: [0, 0] });
    }, 500);

    // タイルレイヤー
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
      opacity: 0.8
    }).addTo(this.map);

    // ローディング表示
    this.showLoading('市区町村境界を読み込み中...');

    try {
      // 市区町村GeoJSONを取得
      await this.loadMunicipalityBoundaries();

      // 病院マーカーを追加
      this.addHospitalMarkers();

      // 凡例追加
      this.addLegend();

      // 医療圏ジャンプセレクタ追加 (Renamed to force update)
      this.renderJumpingControl();

      // ローディング非表示
      this.hideLoading();

      // 初期サイドパネル表示
      this.updateSidePanel(null);

    } catch (error) {
      console.error('Error initializing map:', error);
      this.hideLoading();
    }
  }

  showLoading(message) {
    const container = document.getElementById(this.containerId);
    if (container) {
      const loading = document.createElement('div');
      loading.id = 'map-loading';
      // Inline styles for loading are fine as they are transient, but updated for light theme
      loading.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:rgba(255,255,255,0.95);padding:24px 40px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);display:flex;align-items:center;gap:16px;font-family:"Noto Sans JP",sans-serif;border:1px solid #e2e8f0;';
      loading.innerHTML = `
        <div style="width:28px;height:28px;border:3px solid #2563EB;border-radius:50%;border-top-color:transparent;animation:spin 1s linear infinite;"></div>
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
            fillOpacity: 0.2 // Reduced opacity for cleaner look
          },
          onEachFeature: (feature, layer) => {
            // ツールチップ
            layer.bindTooltip(`<strong>${name}</strong><br><span style="color:${region.color}">${region.name}医療圏</span>`, {
              sticky: true,
              className: 'municipality-tooltip' // CSS class defined in style.css
            });

            // クリックイベント
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e); // 伝播を止める
              console.log('Map clicked:', name);
              console.log('Scenario State - App:', window.app?.currentScenario, 'Map:', this.currentScenario);

              const isCustom = (window.app && window.app.currentScenario === 'custom') || this.currentScenario === 'custom';

              if (isCustom) {
                // Pass municipality name for detailed selection
                console.log('Toggling municipality (Custom Mode):', name);
                if (window.app) window.app.toggleMunicipalitySelection(name);
              } else {
                // Default Region Selection
                if (window.app && window.app.selectRegion) {
                  window.app.selectRegion(regionId);
                } else {
                  this.selectRegion(regionId);
                }
              }
            });

            // ホバーイベント
            layer.on('mouseover', (e) => {
              if (this.currentRegion !== regionId) {
                e.target.setStyle({ weight: 4, fillOpacity: 0.4 });
              }
            });

            layer.on('mouseout', (e) => {
              if (this.currentRegion !== regionId) {
                e.target.setStyle({ weight: 2, fillOpacity: 0.2 });
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
        fillOpacity: 0.2
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

        const minRadius = 6;
        const maxRadius = 18;
        const radius = minRadius + Math.min((hospital.beds - 100) / 700, 1) * (maxRadius - minRadius);

        let borderColor = '#ffffff';
        let borderWidth = 2;
        if (hospital.type === '特定機能' || hospital.type === '基幹' || hospital.type === '地域医療支援') {
          borderColor = '#F59E0B'; // Amber for importance
          borderWidth = 3;
        }

        const marker = L.circleMarker([hospital.lat, hospital.lng], {
          radius: Math.max(radius, 6),
          fillColor: region.color,
          color: borderColor,
          weight: borderWidth,
          fillOpacity: 0.9,
          className: 'hospital-marker'
        });

        // Updated Popup Content (Clean HTML, no inline styles)
        // Note: Leaflet popups are stylable via CSS, but we keep some basic structure here.
        marker.bindPopup(`
          <div class="hospital-popup-content">
            <h3 style="color:${region.color}; border-bottom: 2px solid ${region.color}15;">${hospital.name}</h3>
            <div class="hospital-meta">
              <span class="type-badge">${hospital.type}</span>
              <span class="beds-display">
                <span class="count" style="color:${region.color}">${hospital.beds}</span>
                <span class="unit">床</span>
              </span>
            </div>
            <div class="address-row">📍 ${hospital.address}</div>
            <div style="display:flex; gap:8px; margin-top:8px;">
               ${hospital.url ? `<a href="${hospital.url}" target="_blank" class="website-link btn-sm">🔗 公式サイト</a>` : ''}
               <button onclick="window.hiroshimaMap.showCoverage(${hospital.lat}, ${hospital.lng}, '${hospital.name}')" class="btn-sm" style="cursor:pointer; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe;">⭕ 到達圏表示</button>
            </div>
          </div>
          <style>
            /* Scoped internal styles for popup content uniqueness if needed, but mostly relying on global style.css */
            .hospital-popup-content h3 { margin: 0 0 10px; font-size: 14px; padding-bottom: 4px; }
            .hospital-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
            .type-badge { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 11px; color: #475569; }
            .beds-display .count { font-size: 18px; font-weight: 700; margin-right: 2px; }
            .beds-display .unit { font-size: 11px; color: #64748b; }
            .address-row { font-size: 11px; color: #64748b; margin-bottom: 8px; }
            .btn-sm { font-size: 10px; padding: 4px 8px; border-radius: 4px; text-decoration: none; display:inline-block; }
            .website-link { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
            .website-link:hover { background: #f1f5f9; }
          </style>
        `, { maxWidth: 280 });

        marker.bindTooltip(`${hospital.name}<br>${hospital.beds}床`, { direction: 'top', className: 'hospital-tooltip' });
        marker.addTo(this.map);
        this.markers.push({ marker, regionKey, hospital });
      });
    });
  }

  selectRegion(regionId) {
    // If we are in custom mode, do NOT perform the standard single-region selection/zoom
    // The App controller will manage the state and call updateForScenario
    if (window.app && window.app.currentScenario === 'custom') {
      return;
    }

    const region = MEDICAL_DATA.regions[regionId];
    if (!region) return;

    // 全ポリゴンのスタイルを更新
    this.municipalityLayers.forEach(({ layer, regionId: rId }) => {
      if (rId === regionId) {
        layer.setStyle({ weight: 3, fillOpacity: 0.5 });
        if (layer.bringToFront) layer.bringToFront();
      } else {
        layer.setStyle({ weight: 1, fillOpacity: 0.1 });
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
        marker.setStyle({ fillOpacity: 1, opacity: 1 });
        marker.bringToFront();
      } else {
        marker.setStyle({ fillOpacity: 0.3, opacity: 0.4 });
      }
    });

    this.currentRegion = regionId;
    this.updateSidePanel(regionId);

    if (window.app && window.app.updateChartForRegion) {
      window.app.updateChartForRegion(regionId);
    }
  }

  filterMarkers(level) {
    this.markers.forEach(({ marker, hospital }) => {
      const isMatch = (level === 'all') || (hospital.emergencyLevel === Number(level));

      if (isMatch) {
        if (!this.map.hasLayer(marker)) {
          marker.addTo(this.map);
        }
        if (this.currentRegion) {
          const markerObj = this.markers.find(m => m.marker === marker);
          if (markerObj && markerObj.regionKey === this.currentRegion) {
            marker.setStyle({ fillOpacity: 1, opacity: 1 });
          } else {
            marker.setStyle({ fillOpacity: 0.3, opacity: 0.4 });
          }
        } else {
          marker.setStyle({ fillOpacity: 0.9, opacity: 1 });
        }
      } else {
        if (this.map.hasLayer(marker)) {
          marker.removeFrom(this.map);
        }
      }
    });
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
    let html = '<div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:1rem;text-align:center;">地図をクリックして詳細を表示</div>';

    Object.entries(MEDICAL_DATA.regions).forEach(([id, region]) => {
      const popChange = ((region.population[2040] - region.population[2020]) / region.population[2020] * 100).toFixed(1);

      // Using new CSS classes for cards
      html += `
        <div class="card" onclick="window.hiroshimaMap && window.hiroshimaMap.selectRegion('${id}')" 
             style="cursor:pointer; border-left: 4px solid ${region.color}; transition: all 0.2s; margin-bottom: 1rem;">
          <div class="card-body" style="padding: 1rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-weight:700;font-size:1.1rem;color:var(--text-primary);">${region.name}医療圏</span>
              </div>
              <span style="font-size:1.2rem;font-weight:700;color:${region.color};">${region.beds.total.toLocaleString()}<span style="font-size:0.8rem;color:var(--text-muted);font-weight:400;">床</span></span>
            </div>
            
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem;line-height:1.4;">
              ${region.municipalities.join('、')}
            </div>

            <div style="display:flex; justify-content: space-between; font-size:0.8rem; background:var(--bg-muted); padding: 0.5rem; border-radius: 4px;">
              <span>人口推移</span>
              <span>
                <strong>${(region.population[2020] / 10000).toFixed(1)}万</strong>
                <span style="color:var(--text-muted);">→</span>
                <strong>${(region.population[2040] / 10000).toFixed(1)}万</strong>
                <span style="color:var(--danger);font-weight:600;margin-left:4px;">(${popChange}%)</span>
              </span>
            </div>
            
            <!-- Added Arrival Time -->
             <div style="display:flex; justify-content: space-between; font-size:0.8rem; background:var(--bg-muted); padding: 0.5rem; border-radius: 4px; margin-top: 4px;">
              <span>平均現場到着時間</span>
              <span style="font-weight:700;">${region.avgArrivalTime || '-'} <span style="font-size:0.7rem;font-weight:400;">分</span></span>
            </div>
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
      <div style="margin-bottom:1rem;">
        <button class="btn btn-secondary" onclick="window.hiroshimaMap && window.hiroshimaMap.resetView()">
          ← 一覧に戻る
        </button>
      </div>
      
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border-color);">
        <span style="width:20px;height:20px;border-radius:4px;background:${region.color};"></span>
        <h2 style="margin:0;font-size:1.5rem;font-weight:800;color:var(--text-primary);">${region.name}医療圏</h2>
      </div>
      
      <!-- Stats Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:1.5rem;">
        <div class="stat-card">
          <div class="stat-value" style="color:${region.color}">${region.beds.total.toLocaleString()}</div>
          <div class="stat-label">総病床数</div>
        </div>
        <div class="stat-card">
           <div class="stat-value" style="color:${region.avgTransportTime < 45 ? 'var(--secondary)' : 'var(--danger)'}">
             ${region.avgTransportTime}<span style="font-size:1rem;">分</span>
           </div>
           <div class="stat-label">平均搬送時間</div>
        </div>
      </div>

      <!-- Population -->
      <div class="card" style="margin-bottom:1.5rem;">
        <div class="card-body" style="padding:1rem;">
          <h4 style="font-size:0.9rem;margin-bottom:0.5rem;">人口推移予測</h4>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;">
            <div>
              <div style="font-size:0.8rem;color:var(--text-muted);">2020年: ${(region.population[2020] / 10000).toFixed(1)}万人</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">2040年: ${(region.population[2040] / 10000).toFixed(1)}万人</div>
            </div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--danger);">${popChange}%</div>
          </div>
        </div>
      </div>
      
      <!-- Beds Graph -->
      <div style="margin-bottom:1.5rem;">
        <div style="font-size:0.9rem;font-weight:600;color:var(--text-secondary);margin-bottom:0.5rem;">病床機能構成</div>
        <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--bg-muted);">
          <div style="width:${(region.beds.highAcute / region.beds.total * 100).toFixed(0)}%;background:var(--danger);" title="高度急性期"></div>
          <div style="width:${(region.beds.acute / region.beds.total * 100).toFixed(0)}%;background:var(--accent);" title="急性期"></div>
          <div style="width:${(region.beds.recovery / region.beds.total * 100).toFixed(0)}%;background:var(--secondary);" title="回復期"></div>
          <div style="width:${(region.beds.chronic / region.beds.total * 100).toFixed(0)}%;background:var(--primary);" title="慢性期"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-top:4px;">
           <span>高度: ${region.beds.highAcute}</span>
           <span>慢性: ${region.beds.chronic}</span>
        </div>
      </div>
      
      <!-- Hospital List -->
      <div>
        <div style="font-size:0.9rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;">主要病院 (${region.hospitals.length}件)</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
        ${sortedHospitals.map((h, i) => `
          <div class="hospital-item" 
               onclick="window.hiroshimaMap && window.hiroshimaMap.focusHospital('${h.name}')"
               style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid var(--border-color);border-radius:8px;background:white;cursor:pointer;transition:all 0.2s;">
            <div>
              <div style="font-weight:700;font-size:0.95rem;color:var(--primary);">
                ${h.name} <span style="font-size:0.8em; opacity:0.7;">🔍</span>
              </div>
              <div style="display:flex;gap:6px;margin-top:4px;align-items:center;">
                <span class="type-badge">${h.type}</span>
                ${h.url ? `<a href="${h.url}" target="_blank" onclick="event.stopPropagation()" style="font-size:0.75rem;color:var(--secondary);text-decoration:none;border-bottom:1px solid var(--secondary);">🔗 公式</a>` : ''}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:700;color:${region.color};">${h.beds}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);">床</div>
            </div>
          </div>
        `).join('')}
        </div>
      </div>
    `;

    return html;
  }

  addLegend() {
    const legend = L.control({ position: 'topright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar legend-control-box');
      div.className = 'map-legend-container user-select-none legend-control-box';
      // Inline styles for basic look, margins moved to CSS
      div.style.cssText = 'background:rgba(255,255,255,0.9);padding:10px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:11px;color:#333;';
      div.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;">病床数 / 機能</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <div style="width:10px;height:10px;border-radius:50%;background:#2563EB;opacity:0.9;"></div>
          <span>~200</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <div style="width:14px;height:14px;border-radius:50%;background:#2563EB;opacity:0.9;"></div>
          <span>~500</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <div style="width:18px;height:18px;border-radius:50%;background:#2563EB;opacity:0.9;"></div>
          <span>700~</span>
        </div>
        <div style="border-top:1px solid #ccc;padding-top:4px;display:flex;align-items:center;gap:4px;">
          <div style="width:10px;height:10px;border-radius:50%;background:#2563EB;border:2px solid #F59E0B;"></div>
          <span>特定</span>
        </div>
      `;
      return div;
    };
    legend.addTo(this.map);
  }

  renderJumpingControl() {
    const selector = L.control({ position: 'topleft' });
    selector.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar jump-control-box');
      // Compact, Grid, Colored, No Scroll, Pointer Events Auto. Margins moved to CSS.
      div.style.cssText = 'background:rgba(255,255,255,0.95); padding:8px 12px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:6px; min-width:140px; pointer-events:auto;';

      // Prevent clicks from propagating to map
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      const title = document.createElement('div');
      title.style.cssText = 'font-weight:700; font-size:10px; color:#64748b; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:2px;';
      title.textContent = '医療圏へジャンプ';
      div.appendChild(title);

      const list = document.createElement('div');
      list.style.cssText = 'display:grid; grid-template-columns: 1fr 1fr; gap:6px;';

      // Use global MEDICAL_DATA
      if (typeof MEDICAL_DATA !== 'undefined' && MEDICAL_DATA.regions) {
        Object.values(MEDICAL_DATA.regions).forEach(r => {
          const item = document.createElement('div');
          item.textContent = r.name;
          item.style.cssText = `
            cursor:pointer; 
            font-size:11px; 
            font-weight:600;
            color:${r.color}; 
            padding:4px 6px; 
            border-radius:4px; 
            background:${r.color}19; /* 10% opacity hex */
            border: 1px solid ${r.color}30;
            transition:all 0.2s;
            text-align:center;
          `;

          item.onmouseover = () => {
            item.style.background = r.color;
            item.style.color = 'white';
          };
          item.onmouseout = () => {
            item.style.background = r.color + '19';
            item.style.color = r.color;
          };
          item.onclick = (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            console.log('Jump to region:', r.id);
            if (window.app && typeof window.app.selectRegion === 'function') {
              window.app.selectRegion(r.id);
            } else if (window.hiroshimaMap) {
              console.warn('window.app not found, falling back to hiroshimaMap');
              window.hiroshimaMap.selectRegion(r.id);
            } else {
              console.error('App instance not found');
            }
          };
          list.appendChild(item);
        });
      }

      div.appendChild(list);
      return div;
    };
    selector.addTo(this.map);
  }

  updateForScenario(scenarioId, mergedGroups = [], selectedMunicipalities = new Set()) {
    // If switching TO custom mode, reset any previous region selection state
    if (scenarioId === 'custom') {
      this.currentRegion = null;
      // Optionally reset visual style of markers/map before applying custom styles
      this.map.closePopup();
      // Ensure we are not zoomed into a specific region (optional, but safer)
      // this.resetView(); 
    }

    if (!scenarioId || scenarioId === 'current') {
      this.resetView();
      return;
    }

    // Reset styles logic
    this.municipalityLayers.forEach(({ layer, regionId, name }) => {
      let targetColor = MEDICAL_DATA.regions[regionId].color;
      let weight = 1;
      let opacity = 0.3;
      let dashArray = null;

      // Handle Custom Scenario (Municipality Granularity)
      if (scenarioId === 'custom') {
        // Check if in a merged group (of municipalities)
        let inGroup = false;
        if (mergedGroups && mergedGroups.length > 0) {
          mergedGroups.forEach((group) => {
            if (group.includes(name)) { // Match by Name
              const firstMuniName = group[0];
              const firstMuniEntry = MUNICIPALITY_DATA.find(m => m.name === firstMuniName);
              if (firstMuniEntry) {
                const baseRegionId = firstMuniEntry.regionId;
                targetColor = MEDICAL_DATA.regions[baseRegionId].color;
              }
              inGroup = true;
            }
          });
        }

        // Check if selected
        if (selectedMunicipalities.has(name)) {
          weight = 4;
          opacity = 0.8;
          dashArray = null;
          // Selected items get highlighted border later
        } else if (inGroup) {
          weight = 1;
          opacity = 0.5;
        } else {
          // Default unselected
          opacity = 0.3;
          weight = 1;
        }
      }

      const isCustom = scenarioId === 'custom';
      const isSelected = isCustom && selectedMunicipalities.has(name);

      layer.setStyle({
        fillColor: targetColor,
        // Custom mode: Selected = Gold Border, Unselected = White Border, Normal = Region Color
        color: isSelected ? '#fbbf24' : (isCustom ? '#ffffff' : targetColor),
        weight: isSelected ? 3 : (isCustom ? 1 : weight),
        fillOpacity: opacity,
        dashArray: dashArray
      });

      // If selected, bring to front
      if (isSelected) {
        layer.bringToFront();
      }
    });

    // In custom mode, we don't necessarily reset view unless explicit
    if (scenarioId !== 'custom') {
      this.map.setView(this.center, this.defaultZoom, { animate: true });
      this.currentRegion = null;
      this.updateSidePanel(null);
    }
  }

  focusHospital(hospitalName) {
    const target = this.markers.find(m => m.hospital.name === hospitalName);
    if (target) {
      this.map.flyTo(target.marker.getLatLng(), 14, { animate: true, duration: 1.5 });
      target.marker.openPopup();

      // Highlight marker temporarily
      const originalRadius = target.marker.options.radius;
      // Pulse effect (simple)
      let count = 0;
      const pulseInfo = setInterval(() => {
        if (count > 5) {
          clearInterval(pulseInfo);
          target.marker.setRadius(originalRadius);
          return;
        }
        target.marker.setRadius(originalRadius + (count % 2 === 0 ? 5 : 0));
        count++;
      }, 300);
    }
  }



  resetView() {
    this.municipalityLayers.forEach(({ layer, regionId }) => {
      const region = MEDICAL_DATA.regions[regionId];
      if (region) {
        layer.setStyle({
          color: region.color,
          fillColor: region.color,
          weight: 2,
          fillOpacity: 0.2
        });
      }
    });

    this.markers.forEach(({ marker }) => {
      marker.setStyle({ fillOpacity: 0.9, opacity: 1 });
    });

    this.map.setView(this.center, this.defaultZoom, { animate: true });
    this.currentRegion = null;
    this.updateSidePanel(null);

    // チャート更新用の呼び出し
    if (window.app && window.app.renderChart) {
      window.app.renderChart();
    }
  }
  toggleHumanAnimation() {
    this.isHumanAnimActive = !this.isHumanAnimActive;

    const btn = document.getElementById('btn-pop-anim');
    if (this.isHumanAnimActive) {
      btn.classList.add('active');
      this.renderHumanIcons();
      this.showPopulationLegend(); // Show legend
    } else {
      btn.classList.remove('active');
      this.humanIconLayer.clearLayers();
      this.removePopulationLegend(); // Hide legend
    }
  }

  renderHumanIcons() {
    this.humanIconLayer.clearLayers();

    // Access global data safely
    const data = window.MUNICIPALITY_DATA;
    if (!data) {
      console.warn('Population data not found');
      return;
    }

    // SVG Icon (Simple Human Figure)
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:100%;height:100%;">
        <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
      </svg>
    `;

    data.forEach(city => {
      let pop = city.population;

      // Calculate counts for each scale (Original 10万人/1万人/1000人)
      const largeCount = Math.floor(pop / 100000);  // 10万人
      pop %= 100000;

      const mediumCount = Math.floor(pop / 10000);  // 1万人
      pop %= 10000;

      const smallCount = Math.max(1, Math.floor(pop / 1000));  // 1000人

      // Flatten list for grid (Large -> Medium -> Small)
      const iconList = [];
      for (let i = 0; i < largeCount; i++) iconList.push({ sizeClass: 'large', size: 32 });
      for (let i = 0; i < mediumCount; i++) iconList.push({ sizeClass: 'medium', size: 20 });
      for (let i = 0; i < smallCount; i++) iconList.push({ sizeClass: 'small', size: 12 });

      // Compact Grid Layout - centered on city hall
      const cols = Math.min(iconList.length, 6); // Max 6 columns
      const spacingLat = 0.006;  // Compact (~600m)
      const spacingLng = 0.008;  // Compact (~800m)

      const totalRows = Math.ceil(iconList.length / cols);

      // Center grid on city coordinates
      const startLat = city.lat + ((totalRows - 1) * spacingLat) / 2;
      const startLng = city.lng - ((Math.min(iconList.length, cols) - 1) * spacingLng) / 2;

      iconList.forEach((item, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        const lat = startLat - (row * spacingLat);
        const lng = startLng + (col * spacingLng);

        // Stagger animation delay
        const delay = Math.random() * 1.0;

        const iconHtml = `
          <div class="human-icon ${item.sizeClass}" style="animation-delay:${delay}s">
            ${svgIcon}
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'human-icon-container',
          iconSize: [item.size, item.size],
          iconAnchor: [item.size / 2, item.size]
        });

        const marker = L.marker([lat, lng], {
          icon: icon,
          interactive: false
        });

        this.humanIconLayer.addLayer(marker);
      });
    });

    this.humanIconLayer.addTo(this.map);
  }

  showPopulationLegend() {
    this.removePopulationLegend();

    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar pop-legend-control');
      div.id = 'pop-anim-legend';
      div.style.cssText = `
        background: rgba(255,255,255,0.98);
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        margin-bottom: 60px;
        margin-right: 10px;
        pointer-events: auto;
        min-width: 110px;
      `;

      // Prevent map interactions
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      div.innerHTML = `
        <div style="font-weight:700; font-size:12px; margin-bottom:10px; color:#1e293b; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">👥 人口規模</div>
        <div style="display:grid; grid-template-columns: 28px 1fr; gap:8px; align-items:center;">
          <div style="text-align:center;">
            <svg viewBox="0 0 24 24" fill="#b91c1c" style="width:22px;height:22px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2));"><path d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" /></svg>
          </div>
          <span style="font-size:12px; font-weight:600; color:#334155;">10万人</span>
          
          <div style="text-align:center;">
            <svg viewBox="0 0 24 24" fill="#ef4444" style="width:16px;height:16px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2));"><path d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" /></svg>
          </div>
          <span style="font-size:12px; font-weight:600; color:#334155;">1万人</span>
          
          <div style="text-align:center;">
            <svg viewBox="0 0 24 24" fill="#f87171" style="width:11px;height:11px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2));"><path d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" /></svg>
          </div>
          <span style="font-size:12px; font-weight:600; color:#334155;">1,000人</span>
        </div>
      `;
      return div;
    };
    legend.addTo(this.map);
    this.populationLegendControl = legend;
  }

  removePopulationLegend() {
    const existing = document.getElementById('pop-anim-legend');
    if (existing) {
      existing.remove();
    }
  }
}

// グローバル変数として公開
window.HiroshimaMap = HiroshimaMap;

// Add coverage circle functionality
// Add coverage circle functionality
HiroshimaMap.prototype.showCoverage = function (lat, lng, hospitalName) {
  // Clear existing coverage
  this.clearCoverage();

  this.coverageLayer = L.layerGroup().addTo(this.map);

  // 30min circle (~20km)
  const circle30 = L.circle([lat, lng], {
    radius: 20000,
    color: '#F59E0B', // Amber
    fillColor: '#F59E0B',
    fillOpacity: 0.1,
    weight: 1, // Thinner frame as requested
    dashArray: '4, 4'
  }).addTo(this.coverageLayer);

  // 60min circle (~45km)
  const circle60 = L.circle([lat, lng], {
    radius: 45000,
    color: '#3B82F6', // Blue
    fillColor: '#3B82F6',
    fillOpacity: 0.05,
    weight: 1, // Thinner frame
    dashArray: '4, 4'
  }).addTo(this.coverageLayer);

  // Add labels (using DivIcon) cleanly
  // Place label on the top edge of the circle
  const createLabel = (text, color, offsetKm) => {
    // 1 deg Lat ~= 111km. Offset = radius/111
    const offsetLat = offsetKm / 111;
    return L.marker([lat + offsetLat, lng], {
      icon: L.divIcon({
        className: 'coverage-label',
        html: `<span style="background:rgba(255,255,255,0.9); padding:2px 8px; border-radius:12px; border:1px solid ${color}; color:${color}; font-size:12px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.1); white-space:nowrap;">${text}</span>`,
        iconSize: [120, 24],
        iconAnchor: [60, 12]
      }),
      interactive: false,
      zIndexOffset: 1000
    });
  };

  createLabel('30分圏 (約20km)', '#d97706', 20).addTo(this.coverageLayer);
  createLabel('60分圏 (約45km)', '#2563eb', 45).addTo(this.coverageLayer);

  // Add Coverage Legend if not exists
  if (!this.coverageLegend) {
    this.coverageLegend = L.control({ position: 'bottomright' });
    this.coverageLegend.onAdd = function (map) {
      const div = L.DomUtil.create('div', 'info legend coverage-legend-box');
      div.style.cssText = 'background:white; padding:10px; border-radius:5px; box-shadow:0 1px 5px rgba(0,0,0,0.2); margin-bottom: 20px;';
      div.innerHTML = `
        <div style="font-weight:bold; font-size:12px; margin-bottom:5px;">到達圏 凡例</div>
        <div style="display:flex; align-items:center; gap:5px; margin-bottom:3px;">
          <div style="width:15px; height:0; border-top:2px dashed #F59E0B;"></div>
          <span style="font-size:11px;">30分圏 (20km)</span>
        </div>
        <div style="display:flex; align-items:center; gap:5px;">
          <div style="width:15px; height:0; border-top:2px dashed #3B82F6;"></div>
          <span style="font-size:11px;">60分圏 (45km)</span>
        </div>
      `;
      return div;
    };
    this.coverageLegend.addTo(this.map);
  }

  // Add clear button control if not exists
  if (!document.getElementById('btn-clear-coverage')) {
    const controls = document.querySelector('.map-controls');
    if (controls) {
      const btn = document.createElement('button');
      btn.id = 'btn-clear-coverage';
      btn.className = 'btn btn-secondary';
      btn.innerHTML = '❌ 到達圏クリア';
      btn.onclick = () => window.hiroshimaMap.clearCoverage();
      btn.style.marginLeft = '8px';
      controls.appendChild(btn);
    }
  }

  // Fit bounds to show 60min circle
  this.map.fitBounds(circle60.getBounds());
};

HiroshimaMap.prototype.clearCoverage = function () {
  if (this.coverageLayer) {
    this.coverageLayer.clearLayers();
    this.map.removeLayer(this.coverageLayer);
    this.coverageLayer = null;
  }
  if (this.coverageLegend) {
    this.map.removeControl(this.coverageLegend);
    this.coverageLegend = null;
  }
  const btn = document.getElementById('btn-clear-coverage');
  if (btn) btn.remove();
};

HiroshimaMap.prototype.clearCoverage = function () {
  if (this.coverageLayer) {
    this.coverageLayer.clearLayers();
    this.coverageLayer.removeFrom(this.map);
    this.coverageLayer = null;
  }
  const btn = document.getElementById('btn-clear-coverage');
  if (btn) btn.remove();
};
