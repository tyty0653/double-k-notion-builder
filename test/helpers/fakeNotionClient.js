export class FakeNotionClient {
  constructor() {
    this.calls = [];
    this.objects = new Map();
    this.rows = new Map();
    this.viewObjects = new Map();
    this.counter = 0;
    this.failViewCreation = false;

    this.pages = {
      retrieve: async ({ page_id }) => this.#record("pages.retrieve", { page_id }, () => {
        const value = this.objects.get(page_id);
        if (!value) throw Object.assign(new Error("not found"), { status: 404 });
        return value;
      }),
      create: async (args) => this.#record("pages.create", args, () => {
        const id = this.#id("page");
        const object = { object: "page", id, ...args, in_trash: false };
        this.objects.set(id, object);
        return object;
      }),
    };
    this.databases = {
      retrieve: async ({ database_id }) => this.#record("databases.retrieve", { database_id }, () => {
        const value = this.objects.get(database_id);
        if (!value) throw Object.assign(new Error("not found"), { status: 404 });
        return value;
      }),
      create: async (args) => this.#record("databases.create", args, () => {
        const id = this.#id("database");
        const dataSourceId = this.#id("datasource");
        const dataSource = { object: "data_source", id: dataSourceId, properties: args.initial_data_source?.properties ?? {} };
        const object = { object: "database", id, data_sources: [{ id: dataSourceId, name: args.initial_data_source?.title?.[0]?.text?.content ?? "" }], ...args };
        this.objects.set(id, object);
        this.objects.set(dataSourceId, dataSource);
        return object;
      }),
    };
    this.dataSources = {
      retrieve: async ({ data_source_id }) => this.#record("dataSources.retrieve", { data_source_id }, () => {
        const value = this.objects.get(data_source_id);
        if (!value) throw Object.assign(new Error("not found"), { status: 404 });
        return value;
      }),
      update: async (args) => this.#record("dataSources.update", args, () => {
        const value = this.objects.get(args.data_source_id) ?? { id: args.data_source_id, properties: {} };
        value.properties = { ...value.properties, ...args.properties };
        this.objects.set(args.data_source_id, value);
        return value;
      }),
      query: async (args) => this.#record("dataSources.query", args, () => ({
        object: "list",
        results: [...(this.rows.get(args.data_source_id) ?? [])],
        has_more: false,
        next_cursor: null,
      })),
    };
    this.views = {
      create: async (args) => this.#record("views.create", args, () => {
        if (this.failViewCreation) throw Object.assign(new Error("views unavailable"), { status: 400 });
        const object = { object: "view", id: this.#id("view"), ...args };
        this.viewObjects.set(object.id, object);
        return object;
      }),
      list: async (args) => this.#record("views.list", args, () => ({
        object: "list",
        results: [...this.viewObjects.values()]
          .filter((view) => view.database_id === args.database_id || view.data_source_id === args.data_source_id)
          .map(({ id }) => ({ object: "view", id })),
        has_more: false,
        next_cursor: null,
      })),
      retrieve: async ({ view_id }) => this.#record("views.retrieve", { view_id }, () => {
        const value = this.viewObjects.get(view_id);
        if (!value) throw Object.assign(new Error("not found"), { status: 404 });
        return value;
      }),
    };
    this.search = async (args) => this.#record("search", args, () => ({
      object: "list",
      results: [...this.objects.values()].filter((item) => {
        if (!args.query) return true;
        const title = item.properties?.title?.title?.[0]?.text?.content
          ?? item.title?.[0]?.text?.content
          ?? "";
        return title === args.query;
      }),
      has_more: false,
      next_cursor: null,
    }));
    this.blocks = {
      children: {
        append: async (args) => this.#record("blocks.children.append", args, () => ({ object: "list", results: args.children ?? [] })),
        list: async (args) => this.#record("blocks.children.list", args, () => ({ object: "list", results: [], has_more: false, next_cursor: null })),
      },
    };
  }

  seedObject(object) {
    this.objects.set(object.id, object);
    return object;
  }

  callsFor(name) {
    return this.calls.filter((call) => call.name === name);
  }

  #id(prefix) {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  async #record(name, args, operation) {
    this.calls.push({ name, args });
    return operation();
  }
}
