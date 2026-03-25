// =============================================================================
// СКРИПТ МАССОВОГО СБОРА ТОВАРОВ ИЗ МАГНИТА (несколько магазинов + несколько категорий)
// Автор: Clancy
// Для курсовой: собираем данные сразу по нескольким точкам и разделам
// =============================================================================
(async function aggregateMagnitProducts() {
  console.log(
    "%c🛠️ Старт массового сбора данных из Магнита",
    "color: #0066cc; font-weight: bold; font-size: 1.1em;",
  );

  // ──────────────────────────────────────────────────────────────
  // 1. ВВОД ДАННЫХ ОТ ПОЛЬЗОВАТЕЛЯ
  // ──────────────────────────────────────────────────────────────

  const storesInput = prompt(
    "Введи storeCode магазинов через запятую\n" +
      "Пример: 780019,729927,123456",
  );
  const categoriesInput = prompt(
    "Введи categoryId через запятую\n" + "Пример: 64247,41187,12345",
  );

  if (!storesInput || !categoriesInput) {
    console.error(
      "%c❌ Не введены магазины или категории — выхожу",
      "color: #cc0000; font-weight: bold;",
    );
    return;
  }

  const storeCodes = storesInput
    .trim()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryIds = categoriesInput
    .trim()
    .split(",")
    .map((c) => parseInt(c.trim()))
    .filter((n) => !isNaN(n));

  console.log(
    `%c📋 Буду собирать данные для ${storeCodes.length} магазинов и ${categoryIds.length} категорий`,
    "color: #006600;",
  );
  console.log(`%cМагазины: ${storeCodes.join(", ")}`, "color: #444;");
  console.log(`%cКатегории: ${categoryIds.join(", ")}`, "color: #444;");

  // ──────────────────────────────────────────────────────────────
  // 2. Основные настройки
  // ──────────────────────────────────────────────────────────────

  const LIMIT_PER_REQUEST = 32;
  const MIN_DELAY_MS = 1200;
  const MAX_DELAY_MS = 3500;
  const DELAY_BETWEEN_COMBOS = 3000;
  const MAX_RETRIES = 2; // сколько раз пробовать при ошибке
  const today = new Date().toISOString().slice(0, 10);

  // Массив для сбора ошибок
  let errors = [];

  // ──────────────────────────────────────────────────────────────
  // 3. Headers (общие для всех запросов)
  // ──────────────────────────────────────────────────────────────

  const deviceId = crypto.randomUUID();
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "x-app-version": "2026.3.12-19.7",
    "x-client-name": "magnit",
    "x-device-id": deviceId,
    "x-device-platform": "Web",
    "x-device-tag": "disabled",
    "x-new-magnit": "true",
    "x-platform-version": "Windows Chrome 146",
  };

  console.log(
    `%c🔑 Подготовлены headers (device-id: ${deviceId.slice(0, 8)}...)`,
    "color: #555; font-style: italic;",
  );

  // ──────────────────────────────────────────────────────────────
  // 4. Функция одного запроса с повторными попытками
  // ──────────────────────────────────────────────────────────────

  async function fetchPage(storeCode, categoryId, offset, attempt = 0) {
    const body = {
      sort: { order: "desc", type: "popularity" },
      pagination: { limit: LIMIT_PER_REQUEST, offset },
      categories: [categoryId],
      includeAdultGoods: true,
      storeCode,
      storeType: "1",
      catalogType: "1",
    };

    try {
      const resp = await fetch("https://magnit.ru/webgate/v2/goods/search", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!resp.ok) {
        if (resp.status === 503 && attempt < MAX_RETRIES) {
          throw new Error(`HTTP 503 - сервис недоступен`);
        }
        throw new Error(`HTTP ${resp.status}`);
      }

      return await resp.json();
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.warn(
          `%c⚠️ Ошибка запроса [${storeCode}/${categoryId}] offset=${offset} (попытка ${attempt + 1}): ${err.message}`,
          "color: #cc6600;",
        );
        await new Promise((r) => setTimeout(r, 7000)); // пауза перед повтором
        return fetchPage(storeCode, categoryId, offset, attempt + 1);
      }
      throw err; // если попытки кончились — пробрасываем ошибку
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 5. Главная функция сбора для одной пары
  // ──────────────────────────────────────────────────────────────

  async function collectFor(storeCode, categoryId) {
    console.log(
      `\n%c→ Начинаю сбор: магазин ${storeCode} | категория ${categoryId}`,
      "color: #0066cc; font-weight: bold;",
    );

    let allProducts = [];
    let offset = 0;
    let totalCount = null;
    let page = 1;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        while (true) {
          console.log(
            `%c  Запрос #${page} | offset ${offset} (попытка ${attempt + 1})`,
            "color: #888;",
          );

          const data = await fetchPage(storeCode, categoryId, offset, attempt);

          if (!data?.items || !data?.pagination) {
            console.error(
              "%c  Нет items или pagination — прерываю категорию",
              "color: #cc0000;",
            );
            break;
          }

          const count = data.items.length;
          console.log(`%c  Получено ${count} товаров`, "color: #006600;");

          allProducts.push(...data.items);

          totalCount = data.pagination.totalCount ?? totalCount;

          if (!data.pagination.hasMore || count < LIMIT_PER_REQUEST) {
            console.log(
              `%c  Конец категории (hasMore=false или получено меньше ${LIMIT_PER_REQUEST})`,
              "color: #006600;",
            );
            break;
          }

          offset += LIMIT_PER_REQUEST;
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

        break; // успешно завершили цикл
      } catch (err) {
        attempt++;
        console.warn(
          `%c⚠️ Критическая ошибка [${storeCode}/${categoryId}] (попытка ${attempt}/${MAX_RETRIES + 1}): ${err.message}`,
          "color: #cc6600;",
        );

        if (attempt > MAX_RETRIES) {
          console.error(
            `%c❌ Не удалось собрать после ${MAX_RETRIES + 1} попыток`,
            "color: #cc0000; font-weight: bold;",
          );
          errors.push({
            storeCode,
            categoryId,
            error: err.message,
            success: false,
          });
          break;
        }

        await new Promise((r) => setTimeout(r, 10000)); // 10 сек перед следующей попыткой всего комбо
      }
    }

    // ───── Сохранение ─────
    if (allProducts.length > 0) {
      const filename = `magnit_${storeCode}_${categoryId}_${today}.json`;
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

      if (totalCount !== null) {
        const match =
          allProducts.length === totalCount
            ? "совпадает ✅"
            : "не совпадает ⚠️";
        console.log(
          `%c  Итого: ${allProducts.length} из ${totalCount} (${match})`,
          "color: #444;",
        );
      }

      if (attempt > 0) {
        errors.push({
          storeCode,
          categoryId,
          error: `Успешно со ${attempt + 1} попытки`,
          success: true,
        });
      }
    } else if (attempt > MAX_RETRIES) {
      console.warn(
        `%c⚠️ Ничего не собрано для ${storeCode}/${categoryId}`,
        "color: #cc6600;",
      );
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 6. Запускаем сбор по всем комбинациям
  // ──────────────────────────────────────────────────────────────

  for (const store of storeCodes) {
    for (const cat of categoryIds) {
      await collectFor(store, cat);

      if (storeCodes.length * categoryIds.length > 1) {
        console.log(
          `%c  Пауза между комбинациями ~${DELAY_BETWEEN_COMBOS / 1000} сек...`,
          "color: #777; font-style: italic;",
        );
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_COMBOS));
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 7. Финальный отчёт + сохранение ошибок
  // ──────────────────────────────────────────────────────────────

  console.log(
    "\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "color: #0066cc;",
  );

  if (errors.length > 0) {
    console.log(
      "%c⚠️ Были ошибки во время сбора:",
      "color: #cc6600; font-weight: bold;",
    );

    let report = `Отчёт по ошибкам Магнита - ${today}\n\n`;

    errors.forEach((e, i) => {
      const status = e.success
        ? "✅ Успешно со второй попытки"
        : "❌ Не удалось";
      console.log(
        `%c${status} | ${e.storeCode} / ${e.categoryId} → ${e.error}`,
        e.success ? "color: #006600;" : "color: #cc0000;",
      );

      report += `${i + 1}. ${e.storeCode} / ${e.categoryId} — ${status} — ${e.error}\n`;
    });

    const reportBlob = new Blob([report], { type: "text/plain" });
    const reportUrl = URL.createObjectURL(reportBlob);
    const a = document.createElement("a");
    a.href = reportUrl;
    a.download = `magnit_errors_report_${today}.txt`;
    a.click();
    URL.revokeObjectURL(reportUrl);

    console.log(
      "%c💾 Отчёт об ошибках сохранён: magnit_errors_report_" + today + ".txt",
      "color: #cc6600; font-weight: bold;",
    );
  } else {
    console.log(
      "%c✅ Все категории собраны без ошибок!",
      "color: #006600; font-weight: bold;",
    );
  }

  console.log(
    "%cВСЁ ГОТОВО!",
    "color: #006600; font-weight: bold; font-size: 1.2em;",
  );
  console.log(
    `%cСобрано комбинаций: ${storeCodes.length} × ${categoryIds.length}`,
    "color: #444;",
  );
  console.log("%cМожешь продолжать собирать данные дальше.", "color: #444;");
})();
