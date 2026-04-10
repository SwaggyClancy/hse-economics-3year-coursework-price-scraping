// =============================================================================
// СКРИПТ: Объединение JSON-файлов из подкатегорий в один большой
// Для Пятёрочки (и других сетей)
// Убирает дубликаты по полю "plu"
// =============================================================================
(async function mergeMultipleJsonFiles() {
  console.log(
    "%c🔗 Запуск объединения JSON-файлов из подкатегорий",
    "color: #0066cc; font-weight: bold; font-size: 1.2em;",
  );

  try {
    // Выбор папки
    const dirHandle = await window.showDirectoryPicker();
    console.log(
      "%c📁 Папка выбрана. Начинаю поиск JSON-файлов...",
      "color: #888;",
    );

    let allProducts = [];
    let filesProcessed = 0;
    let totalItemsBefore = 0;

    // Проходим по всем файлам в папке
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".json")) {
        filesProcessed++;
        console.log(
          `%c📄 Обрабатываю файл (${filesProcessed}): ${entry.name}`,
          "color: #555;",
        );

        const file = await entry.getFile();
        const content = await file.text();
        const products = JSON.parse(content);

        if (!Array.isArray(products)) {
          console.warn(
            `%c⚠️ Файл ${entry.name} не содержит массив — пропускаю`,
            "color: #cc6600;",
          );
          continue;
        }

        totalItemsBefore += products.length;
        allProducts.push(...products);
      }
    }

    if (filesProcessed === 0) {
      console.error(
        "%c❌ В выбранной папке не найдено JSON-файлов",
        "color: #cc0000;",
      );
      return;
    }

    console.log(`\n%c📊 Найдено файлов: ${filesProcessed}`, "color: #006600;");
    console.log(
      `%c📦 Товаров до удаления дублей: ${totalItemsBefore}`,
      "color: #006600;",
    );

    // ───── Удаление дублей по plu ─────
    const uniqueProducts = [];
    const seenPlu = new Set();

    for (const product of allProducts) {
      if (product.plu && !seenPlu.has(product.plu)) {
        seenPlu.add(product.plu);
        uniqueProducts.push(product);
      }
    }

    const duplicatesRemoved = allProducts.length - uniqueProducts.length;

    console.log(
      `%c✅ Уникальных товаров после очистки: ${uniqueProducts.length}`,
      "color: #006600; font-weight: bold;",
    );
    if (duplicatesRemoved > 0) {
      console.log(
        `%c🗑️ Удалено дублей: ${duplicatesRemoved}`,
        "color: #cc6600;",
      );
    }

    // ───── Сохранение результата ─────
    const today = new Date().toISOString().slice(0, 10);
    const outputFileName = `5ka_combined_${today}.json`;

    const blob = new Blob([JSON.stringify(uniqueProducts, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(
      "\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "color: #0066cc;",
    );
    console.log(
      `%c✅ Успешно сохранён файл:`,
      "color: #006600; font-weight: bold;",
    );
    console.log(`%c   ${outputFileName}`, "color: #006600;");
    console.log(
      `%c   Количество товаров: ${uniqueProducts.length}`,
      "color: #006600;",
    );
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("%c⚠️ Выбор папки отменён", "color: #cc6600;");
    } else {
      console.error(
        "%c❌ Ошибка при объединении файлов:",
        "color: #cc0000;",
        err.message,
      );
    }
  }
})();
