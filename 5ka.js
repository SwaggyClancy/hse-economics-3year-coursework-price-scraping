// =============================================================================
// СКРИПТ МАССОВОГО СБОРА ТОВАРОВ ИЗ ПЯТЁРОЧКИ (несколько магазинов + несколько категорий)
// Автор: Clancy
// Для курсовой: собираем данные сразу по нескольким точкам и разделам
// =============================================================================
(async function aggregatePyaterochkaProducts() {
  console.log(
    "%c🛠️ Старт массового сбора данных из Пятёрочки",
    "color: #0066cc; font-weight: bold; font-size: 1.1em;",
  );

  // ──────────────────────────────────────────────────────────────
  // 1. ВВОД ДАННЫХ ОТ ПОЛЬЗОВАТЕЛЯ (через запятую)
  // ──────────────────────────────────────────────────────────────

  const storesInput = prompt(
    "Введи ID магазинов через запятую\n" + "Пример: 324K,Y639,A1B2,C7D4",
  );
  const categoriesInput = prompt(
    "Введи ID категорий через запятую\n" +
      "Пример: 251C12891,251C17045,251C13103",
  );

  if (!storesInput || !categoriesInput) {
    console.error(
      "%c❌ Не введены магазины или категории — выхожу",
      "color: #cc0000; font-weight: bold;",
    );
    return;
  }

  const stores = storesInput
    .trim()
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const categories = categoriesInput
    .trim()
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  console.log(
    `%c📋 Буду собирать данные для ${stores.length} магазинов и ${categories.length} категорий`,
    "color: #006600;",
  );
  console.log(`%cМагазины: ${stores.join(", ")}`, "color: #444;");
  console.log(`%cКатегории: ${categories.join(", ")}`, "color: #444;");

  // ──────────────────────────────────────────────────────────────
  // 2. Основные настройки
  // ──────────────────────────────────────────────────────────────

  const PRODUCTS_PER_PAGE = 12;
  const MIN_DELAY_MS = 1200;
  const MAX_DELAY_MS = 3500;
  const DELAY_BETWEEN_COMBOS = 3000; // между разными парами магазин+категория
  const today = new Date().toISOString().slice(0, 10);

  // ──────────────────────────────────────────────────────────────
  // 3. Главная функция сбора для одной пары (магазин + категория)
  // ──────────────────────────────────────────────────────────────

  async function collectFor(storeId, categoryId) {
    console.log(
      `\n%c→ Начинаю сбор: магазин ${storeId} | категория ${categoryId}`,
      "color: #0066cc; font-weight: bold;",
    );

    const baseUrl = `https://5d.5ka.ru/api/catalog/v2/stores/${storeId}/categories/${categoryId}/products?mode=delivery&include_restrict=true`;

    let offset = 0;
    let allProducts = [];
    let page = 1;

    while (true) {
      const url = `${baseUrl}&limit=${PRODUCTS_PER_PAGE}&offset=${offset}`;
      console.log(`%c  Запрос #${page} | offset ${offset}`, "color: #888;");

      let resp;
      try {
        resp = await fetch(url, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        console.warn(
          `%c⚠️ Ошибка сети [${storeId}/${categoryId}] offset=${offset}: ${err.message}`,
          "color: #cc6600;",
        );
        break;
      }

      if (!resp.ok) {
        console.error(
          `%c  HTTP ${resp.status} — возможно неверный магазин/категория`,
          "color: #cc0000;",
        );
        break;
      }

      const data = await resp.json();

      if (!data?.products || !Array.isArray(data.products)) {
        console.error(
          "%c  Нет массива products — прерываю категорию",
          "color: #cc0000;",
        );
        break;
      }

      const count = data.products.length;
      console.log(`%c  Получено ${count} товаров`, "color: #006600;");

      allProducts.push(...data.products);

      if (count === 0 || count < PRODUCTS_PER_PAGE) {
        console.log(
          `%c  Конец категории (получено ${count} из ${PRODUCTS_PER_PAGE})`,
          "color: #006600;",
        );
        break;
      }

      offset += PRODUCTS_PER_PAGE;
      page++;

      const delay = Math.floor(
        MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1),
      );
      console.log(
        `%c  Пауза ${Math.round(delay / 100) / 10} сек...`,
        "color: #777; font-style: italic;",
      );
      await new Promise((r) => setTimeout(r, delay));
    }

    // ───── Сохранение ─────
    if (allProducts.length > 0) {
      const filename = `5ka_${storeId}_${categoryId}_${today}.json`;
      const blob = new Blob([JSON.stringify(allProducts, null, 2)], {
        type: "application/json",
      });
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(urlBlob);

      console.log(
        `%c✓ Сохранено: ${filename} (${allProducts.length} товаров)`,
        "color: #006600; font-weight: bold;",
      );
    } else {
      console.warn(
        `%c⚠️ Ничего не собрано для ${storeId}/${categoryId}`,
        "color: #cc6600;",
      );
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 4. Запускаем сбор по всем комбинациям
  // ──────────────────────────────────────────────────────────────

  for (const store of stores) {
    for (const cat of categories) {
      await collectFor(store, cat);

      // Пауза между разными парами
      if (stores.length * categories.length > 1) {
        console.log(
          `%c  Пауза между комбинациями ~${DELAY_BETWEEN_COMBOS / 1000} сек...`,
          "color: #777; font-style: italic;",
        );
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_COMBOS));
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Финальный отчёт
  // ──────────────────────────────────────────────────────────────

  console.log(
    "\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "color: #0066cc;",
  );
  console.log(
    "%cВСЁ ГОТОВО!",
    "color: #006600; font-weight: bold; font-size: 1.2em;",
  );
  console.log(
    `%cСобрано комбинаций: ${stores.length} × ${categories.length}`,
    "color: #444;",
  );
  console.log("%cКаждый набор сохранён в отдельный файл.", "color: #444;");
  console.log("%cМожешь продолжать собирать данные дальше.", "color: #444;");
})();
