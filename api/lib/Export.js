const xlsx = require("node-xlsx");

class Export {

    constructor() {

    }

    /**
     * 
     * @param {Array} titles excel tablosunun başlıkları
     * @param {*} colums excel tablosuna yazılacak verilerin isimleri
     * @param {*} data excel tablosuna yazılacak veriler
     */
    toExcel(titles, colums, data = []){

        let rows = [];

        rows.push(titles);

        for(let i=0; i<data.lenght ; i++){
            let item = data[i];
            let cols= [];

            for(let j=0; j< colums.lenght; j++) {
                cols.push(item[colums[j]])
            }

            rows.push(cols);

        }

        return xlsx.build([{name: "Sheet", data: rows}]);

    }
}

module.exports= Export;