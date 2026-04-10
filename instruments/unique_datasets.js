// unique_datasets.js
const fs = require("fs");
const path = require("path");
const readline = require("readline");

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

console.log("🔄 Создание уникальных датасетов (Пятёрочка + Магнит)\n");

(async () => {
  try {
    // === Ввод путей ===
    const folder5ka = cleanPath(
      await ask("Путь к папке с JSON-файлами Пятёрочки:\n"),
    );
    const folderMagnit = cleanPath(
      await ask("Путь к папке с JSON-файлами Магнита:\n"),
    );

    let outputFolder = cleanPath(
      await ask(
        "\nКуда сохранять уникальные файлы?\n(Enter — сохранить в текущей папке): ",
      ),
    );
    if (!outputFolder) outputFolder = process.cwd();

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
      console.log(`📁 Создана папка: ${outputFolder}`);
    }

    // Предыдущие датасеты (опционально)
    const prev5kaInput = await ask(
      "\nПуть к предыдущему 5ka_unique_*.json (Enter — пропустить): ",
    );
    const prevMagnitInput = await ask(
      "Путь к предыдущему magnit_unique_*.json (Enter — пропустить): ",
    );

    console.log("\n🔄 Начинаю обработку...\n");

    // === Сбор уникальных товаров ===
    const unique5ka = new Map(); // plu → item
    const uniqueMagnit = new Map(); // id → item

    // Пятёрочка
    console.log("📦 Обрабатываю файлы Пятёрочки...");
    const files5ka = fs
      .readdirSync(folder5ka)
      .filter((f) => f.endsWith(".json"));
    let count5ka = 0;

    for (const file of files5ka) {
      try {
        const data = JSON.parse(
          fs.readFileSync(path.join(folder5ka, file), "utf8"),
        );
        for (const item of Array.isArray(data) ? data : []) {
          if (item.plu) {
            unique5ka.set(String(item.plu).trim(), item);
            count5ka++;
          }
        }
      } catch (e) {
        console.log(`⚠️  Не удалось прочитать: ${file}`);
      }
    }
    console.log(
      `✅ Пятёрочка: собрано ${unique5ka.size} уникальных товаров (всего обработано ${count5ka} записей)`,
    );

    // Магнит
    console.log("\n📦 Обрабатываю файлы Магнита...");
    const filesMagnit = fs
      .readdirSync(folderMagnit)
      .filter((f) => f.endsWith(".json"));
    let countMagnit = 0;

    for (const file of filesMagnit) {
      try {
        const data = JSON.parse(
          fs.readFileSync(path.join(folderMagnit, file), "utf8"),
        );
        for (const item of Array.isArray(data) ? data : []) {
          if (item.id) {
            uniqueMagnit.set(String(item.id).trim(), item);
            countMagnit++;
          }
        }
      } catch (e) {
        console.log(`⚠️  Не удалось прочитать: ${file}`);
      }
    }
    console.log(
      `✅ Магнит: собрано ${uniqueMagnit.size} уникальных товаров (всего обработано ${countMagnit} записей)`,
    );

    // === Дополнение предыдущими данными ===
    if (prev5kaInput.trim() !== "") {
      const prevPath = cleanPath(prev5kaInput);
      if (fs.existsSync(prevPath)) {
        const prev = JSON.parse(fs.readFileSync(prevPath, "utf8"));
        prev.forEach((item) => {
          if (item.plu) unique5ka.set(String(item.plu).trim(), item);
        });
        console.log(
          `📌 Дополнено из предыдущего файла Пятёрочки: ${prev.length} товаров`,
        );
      }
    }

    if (prevMagnitInput.trim() !== "") {
      const prevPath = cleanPath(prevMagnitInput);
      if (fs.existsSync(prevPath)) {
        const prev = JSON.parse(fs.readFileSync(prevPath, "utf8"));
        prev.forEach((item) => {
          if (item.id) uniqueMagnit.set(String(item.id).trim(), item);
        });
        console.log(
          `📌 Дополнено из предыдущего файла Магнита: ${prev.length} товаров`,
        );
      }
    }

    // === Сохранение ===
    const today = new Date().toISOString().slice(0, 10);

    const fiveKaArray = Array.from(unique5ka.values());
    const magnitArray = Array.from(uniqueMagnit.values());

    const file5ka = `5ka_unique_${today}.json`;
    const fileMagnit = `magnit_unique_${today}.json`;

    fs.writeFileSync(
      path.join(outputFolder, file5ka),
      JSON.stringify(fiveKaArray, null, 2),
    );
    fs.writeFileSync(
      path.join(outputFolder, fileMagnit),
      JSON.stringify(magnitArray, null, 2),
    );

    console.log("\n" + "=".repeat(60));
    console.log("✅ УСПЕШНО ЗАВЕРШЕНО!");
    console.log("=".repeat(60));
    console.log(`📁 Папка сохранения: ${outputFolder}`);
    console.log(
      `📄 5ka_unique_${today}.json     → ${fiveKaArray.length} уникальных товаров`,
    );
    console.log(
      `📄 magnit_unique_${today}.json  → ${magnitArray.length} уникальных товаров`,
    );
    console.log("\nГотово! Файлы можно использовать дальше.");
  } catch (err) {
    console.error("\n❌ Ошибка:", err.message);
  } finally {
    rl.close();
  }
})();
