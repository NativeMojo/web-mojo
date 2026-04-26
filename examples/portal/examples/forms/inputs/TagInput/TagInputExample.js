import { Page, FormView } from 'web-mojo';

/**
 * TagInputExample — canonical demo of the `tag` field type.
 *
 * Doc:    docs/web-mojo/forms/inputs/TagInput.md
 * Route:  forms/inputs/tag-input
 *
 * What this shows:
 *   1. Two `tag` fields side by side: one with static autocomplete suggestions,
 *      one capped with `maxTags` and pre-seeded `value`.
 *   2. Output shape — `await form.getFormData()` returns each field as an
 *      array of strings, regardless of whether the user typed or picked from
 *      the autocomplete list.
 *   3. Keyboard model — Enter or comma adds a tag, Backspace removes the last
 *      tag when the input is empty. (No JS in this file controls that — it's
 *      built into the field type.)
 */
class TagInputExample extends Page {
    static pageName = 'forms/inputs/tag-input';
    static route = 'forms/inputs/tag-input';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TagInputExample.pageName,
            route: TagInputExample.route,
            title: 'TagInput — tags with autocomplete',
            template: TagInputExample.TEMPLATE,
        });
        this.snapshot = null;
    }

    async onInit() {
        await super.onInit();

        this.form = new FormView({
            containerId: 'tag-form',
            data: { categories: ['Tech', 'Design'] },
            fields: [
                {
                    type: 'tag',
                    name: 'technologies',
                    label: 'Technologies',
                    placeholder: 'Type to see suggestions...',
                    help: 'Press Enter or comma to add. Try "Java".',
                    autocomplete: [
                        'JavaScript', 'TypeScript', 'Python', 'Java',
                        'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
                    ],
                },
                {
                    type: 'tag',
                    name: 'categories',
                    label: 'Categories (max 5)',
                    maxTags: 5,
                    placeholder: 'Add up to 5 categories...',
                    tagClass: 'badge bg-success',
                },
            ],
        });
        this.addChild(this.form);
    }

    async onActionShow(event) {
        event.preventDefault();
        const data = await this.form.getFormData();
        this.snapshot = JSON.stringify(data, null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>TagInput</h1>
            <p class="example-summary">
                Tag input with autocomplete suggestions. Output is always an array of strings.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/inputs/TagInput.md">
                    docs/web-mojo/forms/inputs/TagInput.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card">
                        <div class="card-body">
                            <div data-container="tag-form"></div>
                            <button type="button" class="btn btn-primary mt-3" data-action="show">
                                <i class="bi bi-eye"></i> Show form data
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="card">
                        <div class="card-header">getFormData() output</div>
                        <div class="card-body">
                            {{#snapshot|bool}}
                                <pre class="mb-0 small"><code>{{snapshot}}</code></pre>
                            {{/snapshot|bool}}
                            {{^snapshot|bool}}
                                <p class="text-muted mb-0">
                                    Add some tags then click <strong>Show form data</strong>.
                                </p>
                            {{/snapshot|bool}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default TagInputExample;
