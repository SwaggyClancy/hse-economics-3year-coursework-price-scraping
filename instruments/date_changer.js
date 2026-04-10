// change_date.js
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("📅 Скрипт массового изменения даты в названиях JSON-файлов\n");

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

(async function main() {
  try {
    // 1. Выбор сети
    const network = await ask(
      "Для какой сети меняем дату?\n1 - Пятёрочка (5ka)\n2 - Магнит\nВведи 1 или 2: ",
    );

    const networkName = network.trim() === "1" ? "5ka" : "Magnit";

    // 2. Путь к папке
    const folderInput = await ask(
      `\nВведи путь к папке (можно с обратными слешами \\):\nПример: C:\\Users\\ThinkPad\\Desktop\\курсовая\\Сборы\\26.03.2026\\5ka\nПуть: `,
    );

    // Нормализуем путь (заменяем \ на / и убираем лишние кавычки)
    let folderPath = folderInput.trim().replace(/"/g, "").replace(/\\/g, "/");

    if (!fs.existsSync(folderPath)) {
      console.error("❌ Папка не найдена по указанному пути!");
      rl.close();
      return;
    }

    // 3. Новая дата
    const newDate = await ask(
      `\nВведи новую дату в формате YYYY-MM-DD\nПример: 2026-04-09\nДата: `,
    );

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      console.error("❌ Неверный формат даты!");
      rl.close();
      return;
    }

    console.log(`\n🚀 Начинаем обработку...`);
    console.log(`Сеть: ${networkName}`);
    console.log(`Папка: ${folderPath}`);
    console.log(`Новая дата: ${newDate}\n`);

    let count = 0;
    let renamed = 0;

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      if (!file.toLowerCase().endsWith(".json")) continue;

      count++;
      const oldFullPath = path.join(folderPath, file);

      // Заменяем дату в имени файла
      const newFileName = file.replace(/\d{4}-\d{2}-\d{2}/, newDate);

      if (newFileName === file) {
        console.log(`⚠️ Пропущен (нет даты): ${file}`);
        continue;
      }

      const newFullPath = path.join(folderPath, newFileName);

      // Копируем содержимое
      const content = fs.readFileSync(oldFullPath);
      fs.writeFileSync(newFullPath, content);

      console.log(`✓ ${file} → ${newFileName}`);
      renamed++;

      // Если хочешь удалять старые файлы — раскомментируй строку ниже:
      // fs.unlinkSync(oldFullPath);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Готово!`);
    console.log(`Обработано файлов: ${count}`);
    console.log(`Переименовано: ${renamed}`);
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
  } finally {
    rl.close();
  }
})();
