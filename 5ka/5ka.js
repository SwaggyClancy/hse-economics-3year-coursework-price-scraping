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
  // 1. ВВОД ДАННЫХ ОТ ПОЛЬЗОВАТЕЛЯ
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
  const DELAY_BETWEEN_COMBOS = 3000;
  const MAX_RETRIES = 2;                    // сколько раз пробовать при ошибке
  const today = new Date().toISOString().slice(0, 10);

  // Массив для сбора ошибок
  let errors = [];

  // ──────────────────────────────────────────────────────────────
  // 3. Главная функция сбора для одной пары с повторными попытками
  // ──────────────────────────────────────────────────────────────

  async function collectFor(storeId, categoryId) {
    console.log(
      `\n%c→ Начинаю сбор: магазин ${storeId} | категория ${categoryId}`,
      "color: #0066cc; font-weight: bold;",
    );

    const baseUrl = `https://5d.5ka.ru/api/catalog/v2/stores/${storeId}/categories/${categoryId}/products?mode=delivery&include_restrict=true`;

    let allProducts = [];
    let offset = 0;
    let page = 1;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        while (true) {
          const url = `${baseUrl}&limit=${PRODUCTS_PER_PAGE}&offset=${offset}`;
          console.log(`%c  Запрос #${page} | offset ${offset} (попытка ${attempt + 1})`, "color: #888;");

          const resp = await fetch(url, {
            credentials: "include",
            headers: { Accept: "application/json" },
          });

          if (!resp.ok) {
            if (resp.status === 503 && attempt < MAX_RETRIES) {
              throw new Error(`HTTP 503 - сервис недоступен (попробуем ещё раз)`);
            }
            console.error(`%c  HTTP ${resp.status} — возможно неверный магазин/категория`, "color: #cc0000;");
            throw new Error(`HTTP ${resp.status}`);
          }

          const data = await resp.json();

          if (!data?.products || !Array.isArray(data.products)) {
            console.error("%c  Нет массива products — прерываю категорию", "color: #cc0000;");
            break;
          }

          const count = data.products.length;
          console.log(`%c  Получено ${count} товаров`, "color: #006600;");

          allProducts.push(...data.products);

          if (count === 0 || count < PRODUCTS_PER_PAGE) {
            console.log(`%c  Конец категории (получено ${count} из ${PRODUCTS_PER_PAGE})`, "color: #006600;");
            break;
          }

          offset += PRODUCTS_PER_PAGE;
          page++;

          const delay = Math.floor(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
          console.log(`%c  Пауза ${Math.round(delay / 100) / 10} сек...`, "color: #777; font-style: italic;");
          await new Promise((r) => setTimeout(r, delay));
        }

        // Если дошли сюда — значит успешно собрали
        break;

      } catch (err) {
        attempt++;
        console.warn(
          `%c⚠️ Ошибка [${storeId}/${categoryId}] (попытка ${attempt}/${MAX_RETRIES + 1}): ${err.message}`,
          "color: #cc6600;",
        );

        if (attempt > MAX_RETRIES) {
          console.error(`%c❌ Не удалось собрать после ${MAX_RETRIES + 1} попыток`, "color: #cc0000; font-weight: bold;");
          errors.push({
            storeId,
            categoryId,
            error: err.message,
            success: false,
          });
          break;
        }

        // Пауза перед повторной попыткой
        await new Promise((r) => setTimeout(r, 8000)); // 8 секунд перед ретраем
      }
    }

    // ───── Сохранение, если что-то собрали ─────
    if (allProducts.length > 0) {
      const filename = `5ka_${storeId}_${categoryId}_${today}.json`;
      const blob = new Blob([JSON.stringify(allProducts, null, 2)], { type: "application/json" });
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(urlBlob);

      console.log(`%c✓ Сохранено: ${filename} (${allProducts.length} товаров)`, "color: #006600; font-weight: bold;");

      // Если были ошибки, но в итоге получилось — отмечаем
      if (attempt > 0) {
        errors.push({
          storeId,
          categoryId,
          error: `Успешно со ${attempt + 1} попытки`,
          success: true,
        });
      }
    } else if (attempt > MAX_RETRIES) {
      console.warn(`%c⚠️ Ничего не собрано для ${storeId}/${categoryId}`, "color: #cc6600;");
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 4. Запускаем сбор по всем комбинациям
  // ──────────────────────────────────────────────────────────────

  for (const store of stores) {
    for (const cat of categories) {
      await collectFor(store, cat);

      if (stores.length * categories.length > 1) {
        console.log(`%c  Пауза между комбинациями ~${DELAY_BETWEEN_COMBOS / 1000} сек...`, "color: #777; font-style: italic;");
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_COMBOS));
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 5. Финальный отчёт + сохранение ошибок
  // ──────────────────────────────────────────────────────────────

  console.log("\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "color: #0066cc;");

  if (errors.length > 0) {
    console.log("%c⚠️ Были ошибки во время сбора:", "color: #cc6600; font-weight: bold;");

    let report = `Отчёт по ошибкам Пятёрочки - ${today}\n\n`;

    errors.forEach((e, i) => {
      const status = e.success ? "✅ Успешно со второй попытки" : "❌ Не удалось";
      console.log(`%c${status} | ${e.storeId} / ${e.categoryId} → ${e.error}`, e.success ? "color: #006600;" : "color: #cc0000;");
      report += `${i + 1}. ${e.storeId} / ${e.categoryId} — ${status} — ${e.error}\n`;
    });

    // Сохраняем отчёт в txt
    const reportBlob = new Blob([report], { type: "text/plain" });
    const reportUrl = URL.createObjectURL(reportBlob);
    const a = document.createElement("a");
    a.href = reportUrl;
    a.download = `5ka_errors_report_${today}.txt`;
    a.click();
    URL.revokeObjectURL(reportUrl);

    console.log("%c💾 Отчёт об ошибках сохранён: 5ka_errors_report_" + today + ".txt", "color: #cc6600; font-weight: bold;");
  } else {
    console.log("%c✅ Все категории собраны без ошибок!", "color: #006600; font-weight: bold;");
  }

  console.log("%cВСЁ ГОТОВО!", "color: #006600; font-weight: bold; font-size: 1.2em;");
  console.log(`%cСобрано комбинаций: ${stores.length} × ${categories.length}`, "color: #444;");
  console.log("%cМожешь продолжать собирать данные дальше.", "color: #444;");
})();