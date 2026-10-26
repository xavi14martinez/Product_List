import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { ProductDetail as ProductDetailModel } from '../models/product';
import { Loader } from '../loader/loader';

const API = 'https://dummyjson.com/products';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, CurrencyPipe, DecimalPipe, Loader],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);

  private readonly productId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );

  protected readonly productResource = httpResource<ProductDetailModel>(() => {
    const id = this.productId();
    return id ? `${API}/${id}` : undefined;
  });

  protected readonly product = computed(() =>
    this.productResource.hasValue() ? this.productResource.value() : null,
  );
  protected readonly loading = computed(() => this.productResource.isLoading());
  protected readonly error = computed(() => {
    if (!this.productId()) {
      return 'Producto no encontrado.';
    }
    if (this.productResource.status() === 'error') {
      return 'No se pudo cargar el producto.';
    }
    return null;
  });
}
