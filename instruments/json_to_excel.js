// json_to_excel.js
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const XLSX = require("xlsx");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function cleanPath(input) {
  return input
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\/g, "/");
}

console.log("📊 JSON → Excel конвертер (Пятёрочка / Магнит)\n");

(async () => {
  try {
    // 1. Выбор сети
    console.log("Выбери сеть:");
    console.log("1 — Пятёрочка");
    console.log("2 — Магнит");
    const networkType = await ask("Введи 1 или 2: ");
    const is5ka = networkType.trim() === "1";
    const chainName = is5ka ? "5ka" : "magnit";

    // 2. Режим: один файл или папка
    console.log("\nРежим обработки:");
    console.log("1 — Один JSON-файл");
    console.log("2 — Папка с JSON-файлами");
    const mode = await ask("Введи 1 или 2: ");
    const isFolder = mode.trim() === "2";

    // 3. Путь
    const inputPath = cleanPath(
      await ask(`\nПуть к ${isFolder ? "папке" : "JSON-файлу"}:\n`),
    );

    if (!fs.existsSync(inputPath)) {
      console.error("❌ Путь не найден!");
      rl.close();
      return;
    }

    // 4. Папка для сохранения Excel
    let outputFolder = cleanPath(
      await ask("\nКуда сохранить Excel? (Enter — текущая папка): "),
    );
    if (!outputFolder) outputFolder = process.cwd();
    if (!fs.existsSync(outputFolder))
      fs.mkdirSync(outputFolder, { recursive: true });

    console.log(`\n🚀 Начинаю обработку...`);

    let allProducts = [];

    if (isFolder) {
      console.log(`📁 Обрабатываю папку: ${inputPath}`);
      const files = fs
        .readdirSync(inputPath)
        .filter((f) => f.toLowerCase().endsWith(".json"));
      let processedFiles = 0;

      for (const file of files) {
        processedFiles++;
        console.log(`   [${processedFiles}/${files.length}] Читаю: ${file}`);
        try {
          const data = JSON.parse(
            fs.readFileSync(path.join(inputPath, file), "utf8"),
          );
          allProducts = allProducts.concat(Array.isArray(data) ? data : []);
        } catch (e) {
          console.log(`   ⚠️  Ошибка чтения ${file}`);
        }
      }
    } else {
      console.log(`📄 Читаю файл: ${inputPath}`);
      const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
      allProducts = Array.isArray(data) ? data : [];
    }

    console.log(`✅ Загружено товаров: ${allProducts.length}`);

    // Преобразование в плоский формат
    console.log("🔄 Преобразую данные в таблицу...");
    const excelData = allProducts.map((item) => {
      if (is5ka) {
        return {
          plu: item.plu || "",
          name: item.name || "",
          price_regular: item.prices?.regular || "",
          price_discount: item.prices?.discount || "",
          uom: item.uom || "",
          property_clarification: item.property_clarification || "",
          is_available: item.is_available || "",
          rating: item.rating?.rating_average || "",
          stock_limit: item.stock_limit || "",
        };
      } else {
        return {
          id: item.id || "",
          name: item.name || "",
          price: item.price || "",
          old_price: item.promotion?.oldPrice || "",
          discount_percent: item.promotion?.discountPercent || "",
          uom: item.weighted?.unitLabel || "шт",
          available: item.quantity > 0 ? "Да" : "Нет",
          rating: item.ratings?.rating || "",
        };
      }
    });

    // Создание Excel
    const today = new Date().toISOString().slice(0, 10);
    const excelFileName = `${chainName}_full_${today}.xlsx`;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Товары");
    XLSX.writeFile(wb, path.join(outputFolder, excelFileName));

    console.log("\n" + "=".repeat(70));
    console.log("✅ УСПЕШНО ЗАВЕРШЕНО!");
    console.log("=".repeat(70));
    console.log(`📁 Сеть: ${is5ka ? "Пятёрочка" : "Магнит"}`);
    console.log(`📄 Создан файл: ${excelFileName}`);
    console.log(`📍 Расположение: ${outputFolder}`);
    console.log(`📊 Количество строк в Excel: ${excelData.length}`);
    console.log("\nМожешь открывать Excel и работать дальше.");
  } catch (err) {
    console.error("\n❌ Ошибка:", err.message);
  } finally {
    rl.close();
  }
})();
