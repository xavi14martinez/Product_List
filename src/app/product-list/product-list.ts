import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Component, computed, DestroyRef, inject, ModuleWithProviders, NgModule, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductsResponse } from '../models/product';
import { Loader } from '../loader/loader';

/** API URL for the product list */
const API = 'https://dummyjson.com/products';
/** Page size for the product list */
const PAGE_SIZE = 10;
/** Empty products response */
const EMPTY_PRODUCTS_RESPONSE: ProductsResponse = {
  products: [],
  total: 0,
  skip: 0,
  limit: PAGE_SIZE,
};

/**
 * Product list component
 */
@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, RouterLink, Loader],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  /** Destroy ref for the component */
  private readonly destroyRef = inject(DestroyRef);
  /** Search input subject */
  private readonly searchInput$ = new Subject<string>();

  /** Page size for the product list */
  protected readonly pageSize = PAGE_SIZE;
  /** Search term signal */
  protected readonly searchTerm = signal('');
  /** Debounced search term signal */
  protected readonly debouncedSearchTerm = signal('');
  /** Selected category signal */
  protected readonly selectedCategory = signal('');
  /** Skip signal */
  protected readonly skip = signal(0);
  /** Categories resource */
  protected readonly categoriesResource = httpResource<string[]>(() => `${API}/category-list`, {
    defaultValue: [],
  });
  /** Products resource */
  protected readonly productsResource = httpResource<ProductsResponse>(() => {
    const q = this.debouncedSearchTerm().trim();
    const category = this.selectedCategory();
    const skip = this.skip();

    let url = API;
    const params: Record<string, string | number> = {
      limit: PAGE_SIZE,
      skip,
    };

    if (q) {
      url = `${API}/search`;
      params['q'] = q;
    } else if (category) {
      url = `${API}/category/${encodeURIComponent(category)}`;
    }
    return { url, params };
  }, { defaultValue: EMPTY_PRODUCTS_RESPONSE });
  /** Categories signal */
  protected readonly categories = computed(() => this.categoriesResource.value());
  /** Products signal */
  protected readonly products = computed(() => this.productsResource.value().products);
  /** Total signal */
  protected readonly total = computed(() => this.productsResource.value().total);
  /** Loading signal */
  protected readonly loading = computed(() => this.productsResource.isLoading());
  /** Error signal */
  protected readonly error = computed(() =>
    this.productsResource.status() === 'error'
      ? 'No se pudieron cargar los productos. Inténtalo de nuevo más tarde.'
      : null,
  );
  /** Current page signal */
  protected readonly currentPage = computed(
    () => Math.floor(this.skip() / this.pageSize) + 1,
  );
  /** Total pages signal */
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );
  /** Can go previous signal */
  protected readonly canGoPrevious = computed(() => this.skip() > 0);
  /** Can go next signal */
  protected readonly canGoNext = computed(
    () => this.skip() + this.products().length < this.total(),
  );

  /**
   * Initialize the component
   */
  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.debouncedSearchTerm.set(term);
        this.skip.set(0);
      });
  }

  /**
   * Handle search input event
   * @param {Event} event - The search input event
   */
  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchInput$.next(value);
  }

  /**
   * Handle category change event
   * @param {Event} event - The category change event
   */
  protected onCategoryChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.skip.set(0);
  }

  /**
   * Go to previous page
   */
  protected goToPreviousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }
    this.skip.update((value) => Math.max(0, value - this.pageSize));
  }

  /**
   * Go to next page
   */
  protected goToNextPage(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.skip.update((value) => value + this.pageSize);
  }
}