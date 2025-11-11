const DATA_TYPES = {
  曲名: "string",
  アーティスト: "string",
  リリース年: "string",
  ジャンル: "category", // 範疇情報
  おすすめ度: "number",
};

const DISPLAIES_FOR_SP = {
  タイトル: "primary",
  著者: "none",
  Wikipediaの紹介: "none",
  ジャンル: "secondary",
  おすすめ度: "secondary",
};

const numeralColumns = {};
const categoricalColumns = {};

document.addEventListener("DOMContentLoaded", function () {
  // CSVを読み込んでパースする関数
  fetch("./hobbies_2.csv")
    .then(function (response) {
      return response.text();
    })
    .then(function (data) {
      const records = parseCSV(data);
      const elements = createTableContents(records);
      const master = document.getElementById("master");
      const table = master.querySelector("table");
      table.append(...elements);

      // 検索機能の実装
      const tbody = elements[1]; // テーブルのデータ部分（tbody）を取得
      const input = master.querySelector("input"); // master内にある検索用の<input>要素を取得
      input.addEventListener("input", function () {
        const keyword = input.value; // 検索ボックスに入力された値を取得
        // tbody の子要素を削除
        while (tbody.firstChild) {
          tbody.removeChild(tbody.firstChild);
        }
        createTableBodyRows(tbody, records, keyword);
        console.log(keyword); // 現在の検索キーワードをコンソールに出力（実際の検索処理は後で実装する部分）
      });

            // 統計情報用UIの生成
      createStatsUI(records);
    });
  // 詳細画面の「戻る」ボタンにイベントリスナーを追加
  document.querySelector("#detail > button").addEventListener("click", () => {
    document.body.classList.remove("-showdetail"); // 詳細画面を非表示にする
  });
});

function parseCSV(data) {
  // 改行で行を分割
  const rows = data.split("\n");
  // 最初の行をヘッダーとして分割
  const headers = rows[0].split(",");

  // 各行を連想配列に変換したものを格納する配列を用意
  const records = [];

  // 2行目以降（データ行）を連想配列に変換して格納
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(",");
    let record = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j];
    }
    records.push(record);
  }
    // DATA_TYPESで定義された各フィールドについて処理
  for (const key in DATA_TYPES) {
    // そのフィールドが数値型（"number"）の場合にのみ処理を行う
    if (DATA_TYPES[key] === "number") {
      // records配列の各レコードに対して、指定されたフィールドの数値を取得
      // Number()関数で数値に変換し、nums配列に格納
      const nums = records.map((record) => Number(record[key]));

      // numeralColumnsオブジェクトに、フィールドごとの最大値と最小値を格納
      numeralColumns[key] = {
        max: Math.max(...nums), // nums配列から最大値を取得
        min: Math.min(...nums), // nums配列から最小値を取得
      };
    }
  // そのフィールドが範疇型（"category"）の場合にのみ処理を行う
    if (DATA_TYPES[key] === "category") {
      // records配列の各レコードに対して、指定されたフィールドの値を取得
      // Setオブジェクトを使って重複を排除し、categoricalColumnsオブジェクトに格納
      categoricalColumns[key] = Array.from(
        new Set(records.map((record) => record[key]))
      );
    }
  }
  
  console.log(categoricalColumns);
  console.log(numeralColumns);
  return records;
}

// records から HTML を生成する関数
function createTableContents(records) {
  const table = document.createElement("table");

  // ヘッダー行を生成
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (let key in records[0]) {
    const th = document.createElement("th");
    th.textContent = key;
    th.dataset.type = DATA_TYPES[key]; // データ型情報を dataset に与える
    th.dataset.spDisplay = DISPLAIES_FOR_SP[key]; // スマホの表示情報を dataset に与える
    th.addEventListener("click", function () {
      setSort(th, records);
    });
    headerRow.append(th);
  }
  thead.append(headerRow);
  // table.append(thead);

  // データ行を生成
  const tbody = document.createElement("tbody");
  createTableBodyRows(tbody, records);
  // table.append(tbody);

  return [thead, tbody];
}

function showDetail(record) {
  document.body.classList.add("-showdetail");
  const detail = document.querySelector("#detail > .container");
  detail.textContent = JSON.stringify(record);

  // 既存の詳細内容をクリア
  while (detail.firstChild) {
    detail.removeChild(detail.firstChild);
  }

  // 各データ項目を表示
  for (const key in record) {
    const dl = document.createElement("dl");
    const dt = document.createElement("dt");
    dt.textContent = key; // データのキー（ヘッダー名）を表示
    const dd = document.createElement("dd");
    dd.textContent = record[key]; // データの値を表示
    dl.append(dt, dd); // dtとddを詳細表示のリストに追加
    detail.append(dl); // 詳細コンテナにリストを追加
  }
}

// ソートを行う関数
function setSort(th, records) {
    switch (th.dataset.sortOrder) {
    case undefined:
      th.dataset.sortOrder = "asc";
      break;
    case "asc":
      th.dataset.sortOrder = "desc";
      break;
    case "desc":
      delete th.dataset.sortOrder;
      break;
  }

    // th の兄弟要素を取得しソートを初期化
  const siblings = th.parentNode.children;
  for (let sibling of siblings) {
    if (sibling !== th) {
      delete sibling.dataset.sortOrder;
    }
  }

    // records を複製してソート
  const key = th.textContent; // ソートするキー（列名）をth要素のテキストから取得
  const type = th.dataset.type; // データ型（string, number, category）をth要素のdata-type属性から取得
  const copiedRecords = [...records]; // 元のデータ（records）を複製して、破壊的な操作を避ける

  // ソート順が指定されている場合にソートを実行
  if (th.dataset.sortOrder !== undefined) {
    copiedRecords.sort((a, b) => {
      const aValue = a[key]; // ソート対象となるaの値を取得
      const bValue = b[key]; // ソート対象となるbの値を取得

      // データ型に応じたソート方法を選択
      switch (type) {
        case "string":
        case "category":
          // 文字列・カテゴリの場合、組み込み関数localeCompare()で文字列の辞書順を比較
          return aValue.localeCompare(bValue);
        case "number":
          // 数値の場合、aとbの差分を返すことで数値の昇順ソートを実現
          return aValue - bValue;
      }
    });
  }

  // ソート順が"desc"の場合、配列を逆順にする
  if (th.dataset.sortOrder === "desc") {
    copiedRecords.reverse();
  }

  console.log(copiedRecords);
  console.log(th);

    // tbody を取得し、子要素を削除
  const tbody = th.closest("table").querySelector("tbody");
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  // ソートされたデータを追加
  createTableBodyRows(tbody, copiedRecords);
}

function createTableBodyRows(tbody, records, keyword) {
  for (let record of records) {
    const tr = document.createElement("tr");
    for (let key in record) {
      const td = document.createElement("td");
      td.textContent = record[key]; // 各データセルに値を設定
      tr.append(td); // データ行にセルを追加
    }
    // 行をクリックしたときに詳細表示を呼び出すイベントリスナーを追加
    tr.addEventListener("click", function (event) {
      showDetail(record); // クリックされた行のデータを詳細表示
    });
    tbody.append(tr); // tbodyにデータ行を追加
  }
}

function createStatsUI(records) {
  // "master" IDを持つ要素内の ".stats > .selector" 要素を取得
  const selector = document.querySelector("#master > .stats > .selector");

  // DATA_TYPESオブジェクト内の各キー（フィールド）についてループ処理
  for (const key in DATA_TYPES) {

    // フィールドが "category" 型の場合に処理を行う
    if (DATA_TYPES[key] === "category") {
      const li = document.createElement("li"); // 新しいリスト項目 (li) を作成
      li.textContent = key; // リスト項目のテキストとしてフィールド名（key）を設定
      selector.append(li); // 作成したリスト項目を selector に追加

      const column = categoricalColumns[key]; // "category"型のフィールドに対応するデータ列を取得
      const counts = {}; // 各カテゴリの値の出現回数を記録するオブジェクト

      // column内のすべてのカテゴリ値について、countsオブジェクトに初期化
      for (const value of column) {
        counts[value] = 0; // 各カテゴリ値をキーにしてカウントを0に初期化
      }

      // records配列をループし、指定された "category" フィールドの値に基づいてカウントを更新
      for (const record of records) {
        counts[record[key]]++; // 該当するカテゴリの出現回数を1増やす
      }

      // リスト項目にクリックイベントリスナーを追加
      li.addEventListener("click", () => {
        // グラフを描画
        drawGraph(counts);
      });
      console.log(counts); // 各カテゴリの出現回数をコンソールに出力
    }
  }
}

function drawGraph(values) {
  const BAR_WIDTH = 10; // 各バーの幅を指定
  const PADDING_TOP = 10; // グラフの上部に空ける余白
  const PADDING_BOTTOM = 60; // グラフの下部に空ける余白（ラベル用）
  const graphContainer = document.querySelector("#master > .stats > .graph"); // グラフを描画するコンテナ要素を取得
  const rect = graphContainer.getBoundingClientRect(); // コンテナのサイズを取得
  const barMaxHeight = rect.height - PADDING_TOP - PADDING_BOTTOM; // バーの最大高さを計算（余白を除く）
  const max = Math.max(...Object.values(values)); // valuesオブジェクト内の最大値を取得
  const heightUnit = barMaxHeight / max; // バーの高さを最大値に基づいて単位化
  const keys = Object.keys(values); // valuesオブジェクトからキーを取得
  const widthUnit = 1 / (keys.length + 1); // 各バーの幅を画面全体の割合で計算

  // 既存のグラフ要素がある場合、全て削除
  while (graphContainer.firstChild) {
    graphContainer.removeChild(graphContainer.firstChild);
  }
  
  // valuesのデータに基づいてバーを描画
  for (var i = 0; i < keys.length; i++) {
    const key = keys[i]; // 現在のキー（カテゴリ名）を取得
    const value = values[key]; // キーに対応する値を取得
    const div = document.createElement("div"); // 新しいdiv要素（バー）を作成
    // バーの位置を計算して設定
    div.style.left = `calc(${(i + 1) * widthUnit * 100}% - ${BAR_WIDTH - 0.5}px)`;
    div.style.left = `${i * 20}px`;
    div.style.height = "100px";
    // バーの高さを設定（値に基づいてスケーリング）
    div.style.height = `${value * heightUnit}px`;
    div.className = "bar"; // バーのCSSクラスを設定
    graphContainer.append(div); // 作成したバーをコンテナに追加
    // バーのラベル（カテゴリ名）を表示
    const label = document.createElement("div"); // ラベル用のdiv要素を作成
    label.textContent = key; // ラベルにカテゴリ名を設定
    label.className = "label"; // ラベルのCSSクラスを設定
    div.append(label); // ラベルをバーに追加
  }
}
