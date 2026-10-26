import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Component, computed, DestroyRef, inject, ModuleWithProviders, NgModule, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductsResponse } from '../models/product';
import { Loader } from '../loader/loader';

const API = 'https://dummyjson.com/products';
const PAGE_SIZE = 10;

const EMPTY_PRODUCTS_RESPONSE: ProductsResponse = {
  products: [],
  total: 0,
  skip: 0,
  limit: PAGE_SIZE,
};

@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, RouterLink, Loader],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchInput$ = new Subject<string>();

  protected readonly pageSize = PAGE_SIZE;

  protected readonly searchTerm = signal('');
  protected readonly debouncedSearchTerm = signal('');
  protected readonly selectedCategory = signal('');
  protected readonly skip = signal(0);

  protected readonly categoriesResource = httpResource<string[]>(() => `${API}/category-list`, {
    defaultValue: [],
  });

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

  protected readonly categories = computed(() => this.categoriesResource.value());
  protected readonly products = computed(() => this.productsResource.value().products);
  protected readonly total = computed(() => this.productsResource.value().total);
  protected readonly loading = computed(() => this.productsResource.isLoading());
  protected readonly error = computed(() =>
    this.productsResource.status() === 'error'
      ? 'No se pudieron cargar los productos. Inténtalo de nuevo más tarde.'
      : null,
  );

  protected readonly currentPage = computed(
    () => Math.floor(this.skip() / this.pageSize) + 1,
  );
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );
  protected readonly canGoPrevious = computed(() => this.skip() > 0);
  protected readonly canGoNext = computed(
    () => this.skip() + this.products().length < this.total(),
  );

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.debouncedSearchTerm.set(term);
        this.skip.set(0);
      });
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchInput$.next(value);
  }

  protected onCategoryChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.skip.set(0);
  }

  protected goToPreviousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }
    this.skip.update((value) => Math.max(0, value - this.pageSize));
  }

  protected goToNextPage(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.skip.update((value) => value + this.pageSize);
  }
}