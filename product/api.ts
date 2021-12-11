import axios from "axios";
import Papa from "papaparse";

import {INFORMATION} from "../app/constants";

import {Option as IOption, Product as IProduct} from "./types";

interface RawOption extends IOption {
  type: "option";
}

interface RawProduct extends IProduct {
  type: "product";
}

class Product implements IProduct {
  id: IProduct["id"];
  title: IProduct["title"];
  category: IProduct["category"];
  description: IProduct["description"];
  image: IProduct["image"];
  options: IProduct["options"];
  price: IProduct["price"];

  constructor() {
    this.options = {} as Product["options"];
  }

  set(product: RawProduct) {
    Object.assign(this, product);
  }

  addOption(option: RawOption) {
    if (!this.options[option.category]) {
      this.options[option.category] = [];
    }

    this.options[option.category].push(option);
  }

  toJSON(): IProduct {
    const product = {
      id: this.id,
      title: this.title,
      category: this.category,
      description: this.description,
      image: this.image,
      options: this.options,
      price: this.price,
    };

    if (Object.keys(product.options).length === 0) {
      delete product.options;
    }

    return product;
  }
}

function normalize(data: (RawProduct | RawOption)[]) {
  const products = new Map<RawProduct["id"], Product>();

  for (const item of data) {
    if (!products.has(item.id)) {
      products.set(item.id, new Product());
    }

    if (item.type === "product") {
      const product = products.get(item.id);

      product.set(item);
    } else if (item.type === "option") {
      const product = products.get(item.id);

      product.addOption(item);
    }
  }

  const normalized: IProduct[] = Object.values(Object.fromEntries(products)).map((product) =>
    product.toJSON(),
  );

  return normalized;
}

export default {
  list: async (): Promise<IProduct[]> => {
    return axios
      .get(INFORMATION.sheet, {
        responseType: "blob",
      })
      .then(
        (response) =>
          new Promise<IProduct[]>((resolve, reject) => {
            Papa.parse(response.data, {
              header: true,
              complete: (results) => {
                const data = normalize(results.data as (RawProduct | RawOption)[]);

                return resolve(data);
              },
              error: (error) => reject(error.message),
            });
          }),
      );
  },
  mock: {
    list: (mock: string): Promise<IProduct[]> =>
      import(`./mocks/${mock}.json`).then((result) =>
        normalize(result.default as (RawProduct | RawOption)[]),
      ),
  },
};
