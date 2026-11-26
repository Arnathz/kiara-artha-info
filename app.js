(function () {
  "use strict";

  const DATA = window.KAP_DATA;
  if (!DATA) return;

  const state = {
    originId: "gps",
    destinationId: DATA.destinations[0].id,
    mapType: "m",
    modalCategory: "Semua",
    modalSearch: "",
    fountainDay: "weekday",
    culinaryZone: "all",
    culinarySearch: ""
  };

  const els = {
    parkLiveStatus: document.getElementById("park-live-status"),
    selectedDestBadge: document.getElementById("selected-dest-badge"),
    selectedDestZone: document.getElementById("selected-dest-zone"),
    selectedDestName: document.getElementById("selected-dest-name"),
    selectedDestDesc: document.getElementById("selected-dest-desc"),
    mainOriginSelect: document.getElementById("main-origin-select"),
    gmapsPreview: document.getElementById("gmaps-preview"),
    gmapsDirectionsLink: document.getElementById("gmaps-directions-link"),
    quickPins: document.getElementById("quick-pins"),
    nextFountainInfo: document.getElementById("next-fountain-info"),
    fountainList: document.getElementById("fountain-list"),
    fountainDisclaimer: document.getElementById("fountain-disclaimer"),
    areaComparisonList: document.getElementById("area-comparison-list"),
    wahanaList: document.getElementById("wahana-list"),
    culinarySearch: document.getElementById("culinary-search"),
    culinaryZoneFilters: document.getElementById("culinary-zone-filters"),
    culinaryZonesContainer: document.getElementById("culinary-zones-container"),
    facilitiesList: document.getElementById("facilities-list"),
    updatesList: document.getElementById("updates-list"),
    // Scan Modal
    scanModal: document.getElementById("scan-modal"),
    openScanModalBtn: document.getElementById("open-scan-modal-btn"),
    changeDestBtn: document.getElementById("change-dest-btn"),
    closeScanModalBtn: document.getElementById("close-scan-modal-btn"),
    skipScanModalBtn: document.getElementById("skip-scan-modal-btn"),
    modalOriginSelect: document.getElementById("modal-origin-select"),
    modalDestSearch: document.getElementById("modal-dest-search"),
    modalCategoryTabs: document.getElementById("modal-category-tabs"),
    modalDestList: document.getElementById("modal-dest-list"),
    // QR Modal
    qrModal: document.getElementById("qr-modal"),
    openQrModalBtn: document.getElementById("open-qr-modal-btn"),
    closeQrModalBtn: document.getElementById("close-qr-modal-btn"),
    qrOriginSelect: document.getElementById("qr-origin-select"),
    qrCanvasBox: document.getElementById("qr-canvas-box"),
    qrUrlPreview: document.getElementById("qr-url-preview"),
    copyQrUrlBtn: document.getElementById("copy-qr-url-btn")
  };

  function getBadgeClass(accessBadge) {
    if (accessBadge === "Gratis") return "badge-free";
    if (accessBadge === "Tiket Taman") return "badge-ticket";
    if (accessBadge === "Berbayar") return "badge-paid";
    return "badge-neutral";
  }

  function getOriginById(id) {
    return DATA.origins.find((o) => o.id === id) || DATA.origins[0];
  }

  function getDestinationById(id) {
    return DATA.destinations.find((d) => d.id === id) || DATA.destinations[0];
  }

  function buildDirectionsUrl(originId, dest) {
    const origin = getOriginById(originId);
    const params = new URLSearchParams({
      api: "1",
      destination: `${dest.lat},${dest.lng}`,
      travelmode: "walking"
    });
    if (origin.lat !== null && origin.lng !== null) {
      params.set("origin", `${origin.lat},${origin.lng}`);
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  function buildEmbedUrl(dest, mapType) {
    const q = dest.embedQuery || `${dest.lat},${dest.lng}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=${encodeURIComponent(mapType)}&z=18&hl=id&output=embed`;
  }

  function getWibNow() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });
    const hour = parseInt(map.hour || "12", 10);
    const minute = parseInt(map.minute || "0", 10);
    const isWeekend = map.weekday === "Sat" || map.weekday === "Sun";
    return {
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
      isWeekend
    };
  }

  function renderParkStatus() {
    const wib = getWibNow();
    const isOpen = wib.totalMinutes >= 9 * 60 && wib.totalMinutes < 21 * 60;
    const hh = String(wib.hour).padStart(2, "0");
    const mm = String(wib.minute).padStart(2, "0");
    els.parkLiveStatus.textContent = isOpen
      ? `Taman Sedang Buka (${hh}.${mm} WIB)`
      : `Taman Tutup (${hh}.${mm} WIB · Buka 09.00 WIB)`;
    els.parkLiveStatus.classList.toggle("is-closed", !isOpen);
  }

  function populateOriginSelects() {
    const optionsHtml = DATA.origins
      .map((o) => `<option value="${o.id}">${o.name}</option>`)
      .join("");
    els.mainOriginSelect.innerHTML = optionsHtml;
    els.modalOriginSelect.innerHTML = optionsHtml;
    els.qrOriginSelect.innerHTML = optionsHtml;

    els.mainOriginSelect.value = state.originId;
    els.modalOriginSelect.value = state.originId;
    els.qrOriginSelect.value = state.originId === "gps" ? "gate-banten" : state.originId;
  }

  function syncOrigin(originId) {
    state.originId = originId;
    els.mainOriginSelect.value = originId;
    els.modalOriginSelect.value = originId;
    renderMapPreview();
    renderModalDestList();
  }

  function renderQuickPins() {
    const featuredIds = [
      "danau-air-mancur",
      "kampung-korea",
      "aiueo-space",
      "mang-engking",
      "lollipops-playland",
      "padel-co",
      "masjid-toilet",
      "parkir-utama"
    ];
    els.quickPins.innerHTML = featuredIds
      .map((id) => {
        const dest = getDestinationById(id);
        const activeClass = dest.id === state.destinationId ? " is-active" : "";
        const shortLabel = dest.name.split(" (")[0].replace("Area ", "");
        return `<button type="button" class="quick-pin-btn${activeClass}" data-pin-id="${dest.id}">${shortLabel}</button>`;
      })
      .join("");
  }

  function renderMapPreview() {
    const dest = getDestinationById(state.destinationId);
    els.selectedDestBadge.textContent = dest.accessBadge;
    els.selectedDestBadge.className = `badge ${getBadgeClass(dest.accessBadge)}`;
    els.selectedDestZone.textContent = dest.zoneLabel;
    els.selectedDestName.textContent = dest.name;
    els.selectedDestDesc.textContent = dest.description;

    const targetEmbed = buildEmbedUrl(dest, state.mapType);
    if (els.gmapsPreview.getAttribute("src") !== targetEmbed) {
      els.gmapsPreview.setAttribute("src", targetEmbed);
    }

    els.gmapsDirectionsLink.setAttribute("href", buildDirectionsUrl(state.originId, dest));
    renderQuickPins();
  }

  function selectDestination(destId, shouldScrollToMap) {
    state.destinationId = destId;
    renderMapPreview();
    renderModalDestList();
    if (shouldScrollToMap) {
      document.getElementById("peta").scrollIntoView({ behavior: "smooth" });
    }
  }

  function renderFountainSchedule() {
    const wib = getWibNow();
    const list = DATA.fountainSchedule[state.fountainDay] || [];
    let nextTime = null;

    for (let i = 0; i < list.length; i++) {
      const [h, m] = list[i].time.split(":").map(Number);
      if (h * 60 + m > wib.totalMinutes) {
        nextTime = list[i];
        break;
      }
    }

    const isViewingTodaySchedule =
      (state.fountainDay === "weekend" && wib.isWeekend) ||
      (state.fountainDay === "weekday" && !wib.isWeekend);

    if (isViewingTodaySchedule) {
      els.nextFountainInfo.textContent = nextTime
        ? `Sesi berikutnya hari ini: ${nextTime.label} (${nextTime.note})`
        : "Seluruh sesi hari ini sudah selesai. Sesi pertama besok pukul 13.00 WIB.";
    } else {
      els.nextFountainInfo.textContent =
        state.fountainDay === "weekend"
          ? "Menampilkan jadwal Sabtu–Minggu & Libur Nasional."
          : "Menampilkan jadwal Senin–Jumat (Weekday).";
    }

    els.fountainList.innerHTML = list
      .map((item) => {
        const isNext = isViewingTodaySchedule && nextTime && nextTime.time === item.time;
        return `
          <li class="fountain-item${isNext ? " is-next" : ""}">
            <span class="fountain-time">${item.label}${isNext ? " · Berikutnya" : ""}</span>
            <span class="fountain-note">${item.note}</span>
          </li>
        `;
      })
      .join("");

    els.fountainDisclaimer.textContent = DATA.fountainSchedule.disclaimer;
  }

  function renderAreasComparison() {
    els.areaComparisonList.innerHTML = DATA.areasComparison
      .map(
        (group) => `
        <article class="card">
          <div class="area-card-head">
            <h3 class="area-card-title">${group.title}</h3>
            <span class="badge ${group.badgeClass}">${group.badge}</span>
          </div>
          <p class="area-card-sub">${group.subtitle}</p>
          <ul class="bullet-list">
            ${group.items.map((text) => `<li>${text}</li>`).join("")}
          </ul>
        </article>
      `
      )
      .join("");
  }

  function renderWahanaList() {
    els.wahanaList.innerHTML = DATA.wahanaList
      .map(
        (item) => `
        <article class="card item-card">
          <div class="item-card-body">
            <h3 class="item-card-title">${item.name}</h3>
            <p class="item-card-meta">${item.price} · ${item.duration}</p>
            <p class="item-card-desc">${item.note}</p>
          </div>
          <div class="item-card-action">
            <span class="badge ${getBadgeClass(item.badge)}">${item.badge}</span>
            <button type="button" class="btn btn-outline btn-xs" data-focus-dest="${item.destinationId}">Lihat di Peta</button>
          </div>
        </article>
      `
      )
      .join("");
  }

  function renderCulinaryZones() {
    const query = state.culinarySearch.trim().toLowerCase();
    const zones = DATA.culinaryZones.filter((z) => state.culinaryZone === "all" || z.id === state.culinaryZone);

    const blocks = zones
      .map((zone) => {
        const matchedTenants = zone.tenants.filter((t) => {
          if (!query) return true;
          return (
            t.name.toLowerCase().includes(query) ||
            t.type.toLowerCase().includes(query) ||
            t.detail.toLowerCase().includes(query) ||
            zone.zoneName.toLowerCase().includes(query)
          );
        });

        if (matchedTenants.length === 0) return "";

        return `
          <article class="card zone-card">
            <div class="zone-header">
              <div>
                <h3 class="zone-title">${zone.zoneName}</h3>
                <p class="zone-location">${zone.locationNote}</p>
              </div>
              <div class="topbar-actions">
                <span class="badge ${getBadgeClass(zone.accessBadge)}">${zone.accessBadge}</span>
                <button type="button" class="btn btn-outline btn-xs" data-focus-dest="${zone.destinationId}">Peta Zona</button>
              </div>
            </div>
            <div class="tenant-list">
              ${matchedTenants
                .map((t) => {
                  const destId = t.destinationId || zone.destinationId;
                  const accessTag = t.accessOverride
                    ? ` <span class="badge ${getBadgeClass(t.accessOverride)}">${t.accessOverride}</span>`
                    : "";
                  return `
                    <div class="tenant-row">
                      <div class="item-card-body">
                        <h4 class="tenant-name">${t.name} <span class="tenant-type">· ${t.type}</span>${accessTag}</h4>
                        <p class="tenant-detail">${t.detail}</p>
                        <p class="tenant-price">Kisaran: ${t.price}</p>
                      </div>
                      <button type="button" class="btn btn-outline btn-xs" data-focus-dest="${destId}">Peta</button>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </article>
        `;
      })
      .filter(Boolean);

    els.culinaryZonesContainer.innerHTML =
      blocks.length > 0
        ? blocks.join("")
        : `<div class="card"><p class="section-desc" style="margin:0;">Tidak ada tenant yang cocok dengan kata kunci "${state.culinarySearch}".</p></div>`;
  }

  function renderFacilities() {
    els.facilitiesList.innerHTML = DATA.facilities
      .map(
        (fac) => `
        <article class="card item-card">
          <div class="item-card-body">
            <h3 class="item-card-title">${fac.name}</h3>
            <p class="item-card-desc">${fac.detail}</p>
          </div>
          <button type="button" class="btn btn-outline btn-xs" data-focus-dest="${fac.destinationId}">Peta</button>
        </article>
      `
      )
      .join("");
  }

  function renderUpdates() {
    els.updatesList.innerHTML = DATA.updates
      .map(
        (upd) => `
        <article class="card">
          <div class="update-top">
            <span class="badge badge-neutral">${upd.tag}</span>
            <span class="update-date">${upd.date} · ${upd.source}</span>
          </div>
          <h3 class="item-card-title">${upd.title}</h3>
          <p class="item-card-desc">${upd.summary}</p>
        </article>
      `
      )
      .join("");
  }

  function renderModalDestList() {
    const query = state.modalSearch.trim().toLowerCase();
    const filtered = DATA.destinations.filter((dest) => {
      const catOk = state.modalCategory === "Semua" || dest.category === state.modalCategory;
      if (!catOk) return false;
      if (!query) return true;
      return (
        dest.name.toLowerCase().includes(query) ||
        dest.zoneLabel.toLowerCase().includes(query) ||
        dest.description.toLowerCase().includes(query)
      );
    });

    if (filtered.length === 0) {
      els.modalDestList.innerHTML = `<p class="section-desc" style="padding:12px 0;">Tujuan tidak ditemukan. Coba kata kunci lain.</p>`;
      return;
    }

    els.modalDestList.innerHTML = filtered
      .map((dest) => {
        const isSelected = dest.id === state.destinationId;
        const directUrl = buildDirectionsUrl(state.originId, dest);
        return `
          <div class="modal-dest-row${isSelected ? " is-selected" : ""}">
            <button type="button" class="modal-dest-pick" data-pick-dest="${dest.id}">
              <span class="modal-dest-name">${dest.name}</span>
              <span class="modal-dest-sub">${dest.zoneLabel} · ${dest.accessBadge}</span>
            </button>
            <a
              href="${directUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary btn-xs"
            >
              Rute ↗
            </a>
          </div>
        `;
      })
      .join("");
  }

  function openScanModal() {
    renderModalDestList();
    els.scanModal.hidden = false;
  }

  function closeScanModal() {
    els.scanModal.hidden = true;
  }

  function buildShareUrl(originId) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    if (originId && originId !== "gps") {
      url.searchParams.set("from", originId);
    }
    return url.toString();
  }

  function renderQrCode() {
    const shareUrl = buildShareUrl(els.qrOriginSelect.value);
    els.qrUrlPreview.textContent = shareUrl;
    els.qrCanvasBox.innerHTML = "";

    if (typeof window.qrcode === "function") {
      try {
        const qr = window.qrcode(0, "M");
        qr.addData(shareUrl);
        qr.make();
        els.qrCanvasBox.innerHTML = qr.createSvgTag({ scalable: true, margin: 1 });
        return;
      } catch (_err) {
        // Fallback below
      }
    }
    els.qrCanvasBox.innerHTML = `<p class="meta-muted" style="text-align:center;margin:0;">QR siap saat online.<br/>Gunakan tombol Salin Tautan di bawah.</p>`;
  }

  function openQrModal() {
    renderQrCode();
    els.qrModal.hidden = false;
  }

  function closeQrModal() {
    els.qrModal.hidden = true;
  }

  function bindEvents() {
    els.mainOriginSelect.addEventListener("change", (e) => syncOrigin(e.target.value));
    els.modalOriginSelect.addEventListener("change", (e) => syncOrigin(e.target.value));

    document.querySelectorAll("[data-map-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mapType = btn.getAttribute("data-map-type");
        document.querySelectorAll("[data-map-type]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        renderMapPreview();
      });
    });

    els.quickPins.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-pin-id]");
      if (!btn) return;
      selectDestination(btn.getAttribute("data-pin-id"), false);
    });

    document.querySelectorAll("[data-fountain-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.fountainDay = btn.getAttribute("data-fountain-day");
        document.querySelectorAll("[data-fountain-day]").forEach((b) => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-selected", active ? "true" : "false");
        });
        renderFountainSchedule();
      });
    });

    els.culinarySearch.addEventListener("input", (e) => {
      state.culinarySearch = e.target.value;
      renderCulinaryZones();
    });

    els.culinaryZoneFilters.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-zone]");
      if (!btn) return;
      state.culinaryZone = btn.getAttribute("data-zone");
      els.culinaryZoneFilters.querySelectorAll("[data-zone]").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
      });
      renderCulinaryZones();
    });

    document.body.addEventListener("click", (e) => {
      const focusBtn = e.target.closest("[data-focus-dest]");
      if (focusBtn) {
        selectDestination(focusBtn.getAttribute("data-focus-dest"), true);
      }
    });

    // Scan Modal Controls
    els.openScanModalBtn.addEventListener("click", openScanModal);
    els.changeDestBtn.addEventListener("click", openScanModal);
    els.closeScanModalBtn.addEventListener("click", closeScanModal);
    els.skipScanModalBtn.addEventListener("click", closeScanModal);

    els.scanModal.addEventListener("click", (e) => {
      if (e.target === els.scanModal) closeScanModal();
    });

    els.modalDestSearch.addEventListener("input", (e) => {
      state.modalSearch = e.target.value;
      renderModalDestList();
    });

    els.modalCategoryTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      state.modalCategory = btn.getAttribute("data-cat");
      els.modalCategoryTabs.querySelectorAll("[data-cat]").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
      });
      renderModalDestList();
    });

    els.modalDestList.addEventListener("click", (e) => {
      const pickBtn = e.target.closest("[data-pick-dest]");
      if (!pickBtn) return;
      selectDestination(pickBtn.getAttribute("data-pick-dest"), false);
      closeScanModal();
    });

    // QR Modal Controls
    els.openQrModalBtn.addEventListener("click", openQrModal);
    els.closeQrModalBtn.addEventListener("click", closeQrModal);
    els.qrModal.addEventListener("click", (e) => {
      if (e.target === els.qrModal) closeQrModal();
    });
    els.qrOriginSelect.addEventListener("change", renderQrCode);
    els.copyQrUrlBtn.addEventListener("click", async () => {
      const shareUrl = buildShareUrl(els.qrOriginSelect.value);
      try {
        await navigator.clipboard.writeText(shareUrl);
        els.copyQrUrlBtn.textContent = "Tautan Tersalin ✓";
        setTimeout(() => {
          els.copyQrUrlBtn.textContent = "Salin Tautan Web Pocket";
        }, 1800);
      } catch (_err) {
        els.copyQrUrlBtn.textContent = "Salin manual URL di atas";
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeScanModal();
        closeQrModal();
      }
    });
  }

  function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get("from");
    const destParam = params.get("dest");

    if (fromParam && DATA.origins.some((o) => o.id === fromParam)) {
      state.originId = fromParam;
    }
    if (destParam && DATA.destinations.some((d) => d.id === destParam)) {
      state.destinationId = destParam;
    }

    const wib = getWibNow();
    state.fountainDay = wib.isWeekend ? "weekend" : "weekday";
    document.querySelectorAll("[data-fountain-day]").forEach((b) => {
      const active = b.getAttribute("data-fountain-day") === state.fountainDay;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function init() {
    initFromUrl();
    populateOriginSelects();
    renderParkStatus();
    renderMapPreview();
    renderFountainSchedule();
    renderAreasComparison();
    renderWahanaList();
    renderCulinaryZones();
    renderFacilities();
    renderUpdates();
    bindEvents();

    // Setiap kali halaman di-scan / dibuka, munculkan modal pilihan "Mau ke mana?"
    openScanModal();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
