import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ImagePreview } from "@/components/ui/image-preview";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createProvider, uploadProviderImage } from "../api/create-provied";

// ------------------ Validation Schema -------------------
const formSchema = z.object({
  companyName: z.string().min(3, { message: "Tên công ty phải có ít nhất 3 ký tự." }),
  phoneNumber: z
    .string()
    .min(10, { message: "Số điện thoại phải có ít nhất 10 chữ số." })
    .max(15, { message: "Số điện thoại không quá 15 chữ số." })
    .regex(/^[0-9]+$/, { message: "Số điện thoại chỉ chứa các chữ số." }),
  email: z.string().email({ message: "Email không hợp lệ." }),
  description: z.string().optional(),
  address: z.object({
    addressLine1: z.string().min(3, { message: "Địa chỉ không được để trống." }),
    addressLine2: z.string().optional(),
  }),
});

// ------------------ Subcomponent: SearchLocation -------------------
function SearchLocation({ value = {}, onChange }) {
  const handleInputChange = (e) => {
    const { name, value: val } = e.target;
    onChange({ ...value, [name]: val });
  };

  return (
    <div className="space-y-2">
      <Input
        name="addressLine1"
        placeholder="Nhập địa chỉ chính..."
        value={value.addressLine1 || ""}
        onChange={handleInputChange}
      />
      <Input
        name="addressLine2"
        placeholder="Địa chỉ bổ sung (không bắt buộc)"
        value={value.addressLine2 || ""}
        onChange={handleInputChange}
      />
    </div>
  );
}

// ------------------ Subcomponent: PrivacyPolicy -------------------
function PrivacyPolicy({ terms, setTerms }) {
  return (
    <div className="flex items-center space-x-2">
      <input
        id="terms"
        type="checkbox"
        checked={terms}
        onChange={(e) => setTerms(e.target.checked)}
      />
      <label htmlFor="terms" className="text-sm text-gray-600">
        Tôi đồng ý với{" "}
        <a href="/terms" className="text-blue-500 underline">
          điều khoản sử dụng
        </a>{" "}
        của hệ thống.
      </label>
    </div>
  );
}

// ------------------ Main Component -------------------
export function TourProviderForm() {
  const [images, setImages] = useState({
    logo: { file: null, preview: null },
    cover: { file: null, preview: null },
  });
  const [terms, setTerms] = useState(false);
  const [open, setOpen] = useState(false);
  const [messageFile, setMessageFile] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      phoneNumber: "",
      email: "",
      description: "",
      address: { addressLine1: "", addressLine2: "" },
    },
  });

  useEffect(() => {
    if (images.logo.file) setMessageFile(null);
    return () => {
      if (images.logo.preview) URL.revokeObjectURL(images.logo.preview);
      if (images.cover.preview) URL.revokeObjectURL(images.cover.preview);
    };
  }, [images.logo.file, images.cover.file]);

  // ✅ Mutation tạo provider
  const { mutate, isLoading } = useMutation({
    mutationFn: createProvider,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      const newProviderId = res.data?.provider_id; // ✅ đúng key trả về từ backend

      if (newProviderId && (images.logo.file || images.cover.file)) {
        uploadImageMutation.mutate({
          providerId: newProviderId,
          images: { logo: images.logo.file, cover: images.cover.file },
        });
      } else {
        setOpen(true);
      }
    },
  });

  // ✅ Mutation upload ảnh
  const uploadImageMutation = useMutation({
    mutationFn: uploadProviderImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setOpen(true);
    },
  });

  // ✅ Xử lý chọn ảnh
  const handleImageChange = useCallback((name, file) => {
    setImages((prev) => {
      if (prev[name]?.preview) URL.revokeObjectURL(prev[name].preview);
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        return { ...prev, [name]: { file, preview: previewUrl } };
      }
      return { ...prev, [name]: { file: null, preview: null } };
    });
  }, []);

  // ✅ Gửi dữ liệu đúng định dạng backend
  const onSubmit = async (values) => {
    if (!images.logo.file) {
      setMessageFile("Logo công ty không được để trống");
      return;
    }

    const payload = {
      user_id: 1, // ⚠️ tạm thời cố định, sau này lấy từ user login
      company_name: values.companyName,
      description: values.description,
      email: values.email,
      phone_number: values.phoneNumber,
      address_id: null, // ⚠️ nếu bạn có bảng địa chỉ riêng thì sửa lại
    };

    mutate(payload);
  };

  const { companyName, phoneNumber, email, address } = form.watch();
  const { errors } = form.formState;
  const isFormValid =
    companyName?.trim() && phoneNumber?.trim() && email?.trim() && address?.addressLine1 && terms;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* ---------- Dialog thông báo ---------- */}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-blue-500">
              Yêu cầu đã được gửi đi
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cảm ơn bạn! Hệ thống sẽ xem xét và phản hồi trong thời gian sớm nhất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate("/d/providers")}>
              Quay lại trang quản lý
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------- Form đăng ký ---------- */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {/* Ảnh đại diện & cover */}
          <div className="flex md:block flex-col gap-2 relative">
            <div className="md:absolute z-10 right-5 mx-auto bottom-10 md:translate-y-1/2">
              <ImagePreview
                name="logo"
                value={images.logo.preview}
                onChange={handleImageChange}
                aspectRatio="avatar"
                className="md:max-w-40 max-w-24"
              />
            </div>
            <ImagePreview
              name="cover"
              value={images.cover.preview}
              onChange={handleImageChange}
              className="max-w-full"
              aspectRatio="cover"
            />
          </div>

          {/* Các trường nhập liệu */}
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên công ty</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số điện thoại</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mô tả công ty</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Giới thiệu về công ty hoặc dịch vụ tour..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Địa chỉ</FormLabel>
                <FormControl>
                  <SearchLocation {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <PrivacyPolicy terms={terms} setTerms={setTerms} />

          {messageFile && <p className="text-red-500 text-center">{messageFile}</p>}

          <Button type="submit" className="w-full" disabled={!isFormValid || isLoading}>
            {isLoading ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default TourProviderForm;
